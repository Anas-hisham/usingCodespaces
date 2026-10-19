# صفحة السيلز (Sales)

الملفات: `features/sales/SalesPage.tsx` + `components/` (TopAgentsCard, AgentSalesDetails, TargetProgressBar, SaleTypeChips, SortDirectionButton, RecordSaleModal) · `domain/sales/` (saleTypes, salesTargets, salesLeaderboard, saleMigration) · `store/crm/reducers/salesReducers.ts`.

كل الأرقام على **الشهر المختار** (الأسهم فوق بتغيّر الشهر).

## الترتيب في الصفحة

1. **ملخص الـ target** حسب الدور: الـ agent = "My monthly target"، الـ TL = تيمه، الـ OM = تيماته، Quality = الشركة كلها. فيه progress bar وعدد السيلز لكل نوع.
2. **Top 5 agents** (`TopAgentsCard`): أول 5 agents في الشركة كلها بعدد السيلز بس (النوع مش ظاهر). الأجنت اللي معندوش سيلز مبيظهرش، والتيم ليدرز مش داخلين.
   - التعادل: الأكتر **Discovery** calls في الشهر، وبعدها الأكتر **LVM**، وبعدها الاسم. الـ calls من `callLogs` بتاعة الأجنت في نفس الشهر (`topAgentsOfMonth`).
3. **All teams**: كل التيمز لكل الأدوار، ويتفرز بعدد السيلز (تنازلي أو تصاعدي بزرار).
   - هيدر التيم **بنفسجي** (violet) وعليه badge "Team Leader" بتاج وحلقة حوالين صورته، فمحدش يفتكره agent. الأجنتس تحته صفوف بيضاء وعليها badge "Agent".
   - صف الشخص الحالي عليه badge "You".
4. **قايمة السيلز** (حسب نطاق الدور زي الملخص): التاريخ، اسم الشركة، كود الـ lead والـ campaign، الأجنت، النوع. لو الليد جاب أكتر من سيلة بيظهر "N sales on this lead". Quality بس عنده زرار مسح.

## More details (خصوصية الـ leads)

الكل يشوف عدد سيلز الكل، لكن زرار **More details** (بيفتح السيلز مجمعة حسب الـ lead: الشركة، الكود، الـ campaign، النوع، التاريخ، وbadge لو الليد جاب أكتر من سيلة) بيظهر لـ:

| الدور | يفتح تفاصيل مين |
|---|---|
| Agent | نفسه بس |
| TL | الأجنتس اللي في تيمه بس |
| OM | الكل |
| Quality | الكل |

الدالة: `canSeeDetails` في `SalesPage.tsx`. ده فلتر عرض في الـ UI (مفيش backend، والداتا كلها في الـ localStorage).

## قواعد التسجيل

- Quality بس بيسجل ويمسح (والـ reducer بيتأكد).
- لازم agent + lead بتاعه + نوع + تاريخ (مش في المستقبل). لو الليد محدش كلمه (مفيش discovery ولا meeting) بيظهر تحذير قبل الحفظ.
- بعد الحفظ الصفحة بتروح لشهر السيلة.
- Analytics → Data quality بيحذر من: سيلة بدون ليد، سيلة على ليد محدش وصله، سيلة لأجنت غير صاحب الليد دلوقتي (بعد تحويل)، وسيلة مكررة (نفس الليد والنوع واليوم).
