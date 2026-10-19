# الأدوار والصفحات

فيه 5 أدوار: `admin`, `operation_manager` (OM), `team_leader` (TL), `agent`, `quality`.
القايمة الجانبية بتتفلتر من `app/navigation.ts`، ولو الصفحة المفتوحة مش مسموحة للدور بيرجع لصفحته الرئيسية.

## مين يفتح إيه

| الصفحة | Admin | OM | TL | Agent | Quality |
|---|:-:|:-:|:-:|:-:|:-:|
| Lead Pool | ✅ | | | | |
| Dashboard | | ✅ | ✅ | ✅ | |
| Analytics | | ✅ | ✅ | ✅ | |
| Teams | ✅ | ✅ | ✅ | ✅ | ✅ |
| Work Queue | | | | ✅ | |
| Leads | | | | ✅ | |
| Calendar | | ✅ | ✅ | ✅ | |
| Sales | | ✅ | ✅ | ✅ | ✅ |
| Team Updates | | ✅ | ✅ | ✅ | |
| Tasks | | ✅ | ✅ | ✅ | |
| Email Center | | ✅ | ✅ | ✅ | |

الصفحة الرئيسية بعد الدخول: Admin ← Lead Pool · Quality ← Sales · الباقي ← Dashboard.

## مين يعمل إيه (والـ store بيفرضه مش الـ UI بس)

| العملية | مين |
|---|---|
| إضافة ليدز للـ pool / مسحها نهائي | Admin (الليد اللي عليه سيلة مبيتمسحش) |
| استلام ليدز من الـ pool | Agent |
| مكالمات / إيميلات / skip / stop على الليد | الـ agent اللي ماسك الليد بس |
| تحويل ليد لـ agent تاني (`transferLeadToAgent`) | OM أو TL بتاع الـ agent اللي ماسكه |
| نقل agent لتيم تاني (`moveAgentToTeam`) | OM، ولتيمز بيديرها هو بس. الليدز والسيلز والتاريخ بيفضلوا مع الـ agent، وبيوصل إشعار للـ agent والـ TL القديم والجديد |
| تسجيل سيلة / مسحها | Quality بس |
| إنشاء Team Update / Task | TL و OM (الـ OM بيكلّف TLs، والـ TL بيكلّف agents) |
| Tasks: الـ agent بيشوف المهام المسندة له بس | |

## مين يشوف إيه (النطاق)

- **Dashboard / Analytics**: الـ agent أرقامه هو، الـ TL تيمه، الـ OM التيمز اللي بيديرها.
- **Sales**: الكل يشوف السيلز بتاعة الكل (حماس)، لكن تفاصيل الـ leads محدودة، شوف `SALES.md`.
- **Team Updates**: الـ audience = `all` أو `team_leaders` أو `specific_team`.
