# شكل المشروع (Architecture)

المشروع React + Redux Toolkit. **مفيش داتا بيز حقيقية**: كل الداتا object واحد (`AppState`) جوه Redux، وبيتحفظ في `localStorage` تحت المفتاح `sales-mgmt-state-v4`.

## الفولدرات

```
src/
├─ main.tsx                 نقطة البداية (Provider + ErrorBoundary)
├─ app/                     الهيكل العام: App، القايمة الجانبية، الصلاحيات، الـ scheduler
│  ├─ navigation.ts         الصفحات وإمتى كل role يفتح أنهي صفحة
│  ├─ useSchedulerTick.ts   بيشغّل الـ jobs كل 30 ثانية
│  └─ layout/               AppShell, Sidebar (أبيض فاتح), NotificationsMenu, UserMenu
├─ domain/                  قواعد الشغل (functions صافية: مفيش React ولا Redux)
│  ├─ types/                نوع الداتا: lead.ts, workflow.ts (touch points), callLog.ts, meeting.ts ...
│  ├─ workflow/             touchPoints, callClassification (nvm/lvm/discovery), leadQueue (today/next/stop), leadExpiry (قاعدة الـ 15 يوم)
│  ├─ lead/                 leadCode (تنضيف/مقارنة الكود), leadPool (مين ياخد إيه), leadImport (لصق الليدز)
│  ├─ sales/                saleTypes (الأنواع)، salesTargets (28 للأجنت)، salesLeaderboard (Top 5)، saleMigration
│  ├─ analytics/            performanceMetrics، dateRange (الأسبوع يبدأ السبت)، commentClassifier، dataQuality
│  ├─ email/ meeting/ user/
├─ store/                   كل اللي بيغيّر الداتا
│  ├─ state/AppState.ts     شكل الداتا كلها
│  ├─ seed/                 الداتا التجريبية (users, teams, workflows, leads, templates)
│  ├─ persistence/          الحفظ والقراءة من localStorage + ترقية الداتا القديمة
│  └─ crm/
│     ├─ crmSlice.ts        بيجمّع الـ reducers بس
│     ├─ reducers/          ملف لكل موضوع (touchPoint, leadWorkflow, leadPool, callLog, transfer, meeting, email, sales ...)
│     ├─ helpers/           الصلاحيات، كتابة الـ history، إعادة جدولة الـ touch point
│     └─ scheduler/         الـ jobs التلقائية (reminder, expiry, auto email, meeting day end)
├─ features/                شاشة = فولدر (dashboard, work-queue, my-leads, lead-pool, take-leads, calendar, ...)
└─ shared/                  حاجات مشتركة (ConfirmDialog, LeadPicker, AgentPicker, UserAvatar, dates, ألوان الـ status)
```

## قواعد الاعتماد (SOLID)

- **Single Responsibility**: كل ملف يجاوب سؤال واحد (مثلاً `leadExpiryJob.ts` = قاعدة الـ 15 يوم بس). الـ `crmSlice` القديم (600 سطر) بقى ملف تجميع + 13 ملف reducers.
- **Dependency direction**: `features → store/domain/shared` و `store → domain`. الـ `domain` ميعرفش حاجة عن React ولا Redux.
- **Open/Closed**: تضيف feature = فولدر جديد + reducers file جديد وتضيفه في `crmSlice` من غير ما تلمس الباقي.
- **Interface Segregation**: الـ components بتاخد props صغيرة محددة (مثلاً `QueueHandlers` في الـ work queue) بدل ما تاخد الـ state كله.

## تغيير الأسماء الأساسية (الـ actions)

| قبل | بعد |
|---|---|
| `setUser` | `setCurrentUser` |
| `claimLeads` | `takeLeadsFromPool` |
| `addPoolLeads` | `addLeadsToPool` |
| `logCall` | `logCallAndCompleteTouchPoint` |
| `addCallLog` | `addCallLogWithoutCompletingTouchPoint` |
| `markTouchpoint` / `skipTouchpoint` / `restoreTouchpoint` | `completeTouchPoint` / `skipTouchPoint` / `restoreSkippedTouchPoint` |
| `stopLead` / `resumeLead` | `stopLeadWorkflow` / `resumeLeadWorkflow` |
| `removeLead` | `removeLeadFromAgentQueue` (بيرجع الليد للـ pool) |
| `deleteLead` | `deleteLeadPermanently` |
| `transferLead` | `transferLeadToAgent` |
| `tickScheduler` | `runScheduledJobs` |
| `hydrate` | `applyStateFromOtherTab` |
| `sendEmail` / `bulkEmail` / `sendCustomEmail` | `sendEmailForLead` / `sendBulkEmailForLeads` / `sendStandaloneEmail` |
| `addMeeting`, `addUpdate`, `ackUpdate`, `addTask`, `toggleTask`, `addSale` | `createMeeting`, `postTeamUpdate`, `acknowledgeTeamUpdate`, `createTask`, `toggleTaskCompletion`, `recordSale` |

وكمان: `Layout→AppShell`, `WorkQueue→WorkQueuePage`, `Leads→MyLeadsPage`, `AdminLeads→LeadPoolPage`, `currentTouchPoint()→findCurrentTouchPoint()`, `fillTemplate→fillEmailTemplate`, `formatSpan→formatDuration`.

> **اتسابت زي ما هي عن قصد**: أسماء الـ fields اللي بتتحفظ في localStorage (`removedFromQueue`, `expiredAt`, `previousAssignments`...) وقيمها (`'nvm'`, `'lvm'`...) والـ storage key. تغييرها كان هيبوّظ داتا المستخدمين المحفوظة، وده تغيير سلوكي.

## الصفحات (features)

| الفولدر | الصفحة | مين يفتحها |
|---|---|---|
| `lead-pool` | Lead Pool (الأدمن يضيف/يمسح الليدز) | Admin |
| `dashboard` | Dashboard (3 نسخ: Agent / TL / OM) | OM, TL, Agent |
| `analytics` | Analytics (KPIs, funnel, حسب campaign/agent/ساعة) | OM, TL, Agent |
| `teams` | Teams (OM ينقل agent بين التيمز) | الكل |
| `work-queue` | Work Queue + `take-leads` (استلام من الـ pool) | Agent |
| `my-leads` | Leads بتاعت الـ agent | Agent |
| `calendar` | Meetings | OM, TL, Agent |
| `sales` | Sales | OM, TL, Agent, Quality |
| `team-updates`, `tasks`, `email-center` | إعلانات / مهام / إيميلات | OM, TL, Agent |

التفاصيل في `ROLES_AND_PAGES.md`. شاشة الدخول (`auth`) مفيهاش باسورد حقيقي: بتختار مستخدم من القايمة.

## أسماء الـ actions الناقصة من الجدول فوق

`moveAgentToTeam` (OM بس) · `editCallLog` · `deleteLeadsAsAdmin` (Admin بس) · `updateMeeting` · `markNotificationRead` / `markAllNotificationsRead` / `addNotification` · `resetToSeedData` (ترجّع الداتا التجريبية).

## ملفات التوثيق

- `DATA_LIFECYCLE.md`: الداتا ودورة حياة الليد والـ scheduler والسيلز.
- `ROLES_AND_PAGES.md`: مين يشوف ويعمل إيه.
- `SALES.md`: صفحة السيلز بالتفصيل (Top 5، تمييز الـ TL، More details).
- `UI_DESIGN_SYSTEM.md`: الألوان والـ components.
