# الأدوار والصفحات

فيه 5 أدوار: `admin`, `operation_manager` (OM), `team_leader` (TL), `agent`, `quality`.
القايمة الجانبية بتتفلتر من `app/navigation.ts`، ولو الصفحة المفتوحة مش مسموحة للدور بيرجع لصفحته الرئيسية.

## مين يفتح إيه

| الصفحة | Admin | OM | TL | Agent | Quality |
|---|:-:|:-:|:-:|:-:|:-:|
| Lead Pool | ✅ | | | | |
| Campaigns | ✅ | | | | |
| Dashboard | | ✅ | ✅ | ✅ | |
| Analytics | | ✅ | ✅ | ✅ | |
| Teams | ✅ | ✅ | ✅ | ✅ | ✅ |
| Work Queue | | | | ✅ | |
| Leads | | | | ✅ | |
| Calendar | | ✅ | ✅ | ✅ | ✅ |
| Sales | | ✅ | ✅ | ✅ | ✅ |
| Team Updates | | ✅ | ✅ | ✅ | ✅ |
| Tasks | | ✅ | ✅ | ✅ | ✅ |
| Tips | | | | ✅ (يستلم) | ✅ (يبعت) |
| Escalations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email Center | | ✅ | ✅ | ✅ | |

الصفحة الرئيسية بعد الدخول: Admin ← Lead Pool · Quality ← Sales · الباقي ← Dashboard.

## مين يعمل إيه (والـ store بيفرضه مش الـ UI بس)

| العملية | مين |
|---|---|
| إضافة ليدز للـ pool / مسحها نهائي | Admin (الليد اللي عليه سيلة مبيتمسحش) |
| إنشاء/تعديل campaign (الكود، الـ touch points، النوع call/email، الأيام بين كل خطوة) / مسحها (لو مفيش ليدز عليها) | Admin |
| استلام ليدز من الـ pool | Agent |
| مكالمات / إيميلات / skip / stop على الليد | الـ agent اللي ماسك الليد بس |
| تحويل ليد لـ agent تاني (`transferLeadToAgent`) | OM أو TL بتاع الـ agent اللي ماسكه |
| نقل agent لتيم/TL تاني (`moveAgentToTeam`) | **Admin بس** (الـ OM مبقاش يقدر). الليدز والسيلز والتاريخ بيفضلوا مع الـ agent، وبيوصل إشعار للـ agent والـ TL القديم والجديد |
| تسجيل سيلة / مسحها | Quality بس |
| إنشاء Team Update / Task | TL و OM (الـ OM بيكلّف TLs **والـ Quality**، والـ TL بيكلّف agents) |
| Team Update من الـ OM | لـ Everyone / كل الـ TLs / Quality بس. مفيش "Specific Team" للـ OM (ده للـ TL: تيمه هو) |
| Meetings | الـ agent مع ليد، الـ TL مع agents تيمه، **الـ Quality مع أي agents زي الـ TL بالظبط**، الـ OM مع TLs تيماته والـ Quality |
| Tips (نصايح) | Quality بس يبعتها لـ agent أو أكتر. الـ agent بيقرأها ويدوس "Got it". مش task: مفيش حاجة تتنفذ |
| Tasks: الـ agent بيشوف المهام المسندة له بس | |

## مين يشوف إيه (النطاق)

- **Dashboard / Analytics**: الـ agent أرقامه هو، الـ TL تيمه، الـ OM التيمز اللي بيديرها.
- **Sales**: الكل يشوف السيلز بتاعة الكل (حماس)، لكن تفاصيل الـ leads محدودة، شوف `SALES.md`.
- **Team Updates**: الـ audience = `all` أو `team_leaders` أو `specific_team`.

## الإشعارات والأرقام (Bell vs. الأرقام جنب القايمة)

- **الجرس (Notifications)**: فيه كل حاجة (updates, tasks, tips, meetings, emails). كل إشعار لشخص واحد (`userId`)، و**اللي عمل الفعل مبيجيلوش إشعار** (الـ TL اللي عمل ميتينج أو الـ OM اللي بعت update مبيتبلغش). الإشعار يفضل لحد ما يدوس Mark read.
- **الرقم جنب Team Updates / Tasks / Tips**: معناه "جديد من آخر مرة فتحت الصفحة دي" بس (`seenBy`). بمجرد ما تفتح الصفحة الرقم بيتشال، والإشعار في الجرس يفضل زي ما هو. الحساب في `app/navBadges.ts`.
- **Team Updates**: الجديد فوق (Needs attention)، واللي اتعمله Acknowledge (أو اللي كله ردّ عليه، لو إنت اللي كاتبه) بيتنقل لقسم **Acknowledged** المقفول.


## الـ LOB (line of business) والـ Quality والتصعيد

- كل **OM** ليه LOB واحد (دلوقتي `REG` للـ Ahmed و `DJ` للـ Layla). التيم والـ TL والـ agents بياخدوا LOB الـ OM بتاعهم. الـ **Quality** ليه LOB كمان (`user.lob`).
- كل **agent** ليه Quality واحد محدد (`user.qualityId`) ولازم يكون من **نفس الـ LOB**. الـ Quality بيشوف ويسجل سيلز ويبعت tips ويعمل meetings للـ agents بتوعه بس، وصفحة Sales بتوريه تيمز الـ LOB بتاعه.
- رسايل/تاسكات الـ OM بتروح لناس الـ LOB بتاعه بس.
- **Admin** (صفحة Teams): زرار *Manager* على كل تيم لنقله لـ OM تاني أو شيله من الـ OM (التيم بيفضل في قسم "Teams without an Operation Manager")، وزرار *Quality* على كل agent (بيعرض Quality الـ LOB بتاعه بس)، وزرار *Move* لنقل agent بين التيمز. لو التيم اتنقل لـ LOB تاني، الـ agents اللي Quality بتاعهم من الـ LOB القديم بيتشال منهم الـ Quality.
- **Escalations** (`escalationRules.ts`): أي حد يقدر يتصعّد عليه (أي تيم / أي LOB / أي role) ما عدا نفسه. اللي بيستلم لازم يكون TL أو OM أو Admin **ومرتبته أعلى من اللي صعّد ومن اللي التصعيد عنه** (agent < Quality < TL < OM < Admin). الفورم فيه بحث (اسم / role / تيم / مدير) وبيعرض التيم والـ TL والـ OM والـ Quality بتوع الشخص، والمقترحين (TL/OM بتوع الشخص، سلسلتك، الـ Admin) فوق. اللي التصعيد وصله يقدر يعدّيه فوق (TL ← OM/Admin، OM ← Admin) أو يقفله. الشخص المتصعَّد عليه مبيشوفش التصعيد، والـ Admin بيشوف الكل.
