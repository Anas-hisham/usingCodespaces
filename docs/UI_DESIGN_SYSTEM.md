# الـ UI Design System

Tailwind فقط. الـ tokens الأساسية موجودة في أول `src/index.css`. الخط: system UI stack (مفيش Google Fonts). أيقونات: `lucide-react`.

## الألوان

| الاستخدام | اللون |
|---|---|
| Primary (أزرار، nav نشط، focus) | **blue** (`bg-blue-600 hover:bg-blue-700`، nav: `bg-blue-50 text-blue-700`) |
| Success (Discovery، خطوة مكتملة، target اتحقق) | **emerald** |
| Warning (LVM/NVM، متأخر) | **amber** |
| Error / حذف / No Response | **rose** |
| Accent: Meetings، Emails، Team Leader | **violet** |
| Call touch points، Activation | **cyan** |
| Neutral | **slate** (خلفية `slate-50`، كروت بيضاء، حدود `slate-200`، فواصل `slate-100`) |

ممنوع indigo / purple / teal / orange / red في الكود الجديد.

## Components

- Card: `rounded-xl border border-slate-200 bg-white shadow-sm`
- Button: `rounded-lg`، primary أزرق، danger rose، ghost `text-slate-600 hover:bg-slate-100`
- Badge: `rounded-full px-2.5 py-0.5 text-xs font-medium`
- Modal: overlay `bg-slate-900/60 backdrop-blur-sm`، المحتوى `rounded-2xl`، الهيدر `border-b border-slate-200`
- Input focus: `focus:border-blue-500 focus:ring-1 focus:ring-blue-500`
- Progress bar: `h-1.5 rounded-full bg-slate-200` والجزء المعبّي `bg-blue-500` (أخضر لما يوصل 100%)
- Sidebar: أبيض، `w-60` على الشاشات الكبيرة، أيقونات بس على الصغيرة

## Breakpoints

mobile-first: `sm 640` · `md 768` · `lg 1024`.

| الشاشة | الـ Sidebar |
|---|---|
| موبايل (تحت `md`) | مخفي. زرار ☰ في الـ header بيفتحه كـ drawer فوق الصفحة (overlay + Escape + قفل أوتوماتيك بعد اختيار صفحة) |
| تابلت (`md` → `lg`) | شريط أيقونات `w-[72px]` |
| ديسكتوب (`lg`+) | كامل `w-60` |

قواعد الـ responsive في أي كود جديد:
- الصفحة: `p-4 sm:p-6`. الـ modal/drawer: padding `px-4 sm:px-6`.
- الـ modal لازم `max-h-modal overflow-y-auto` (utility في `index.css` بتستخدم `dvh`). الارتفاع الكامل للشاشة بـ `h-app` / `min-h-app` مش `h-screen`.
- أي grid بأكتر من عمودين يبدأ بـ `grid-cols-1` أو `grid-cols-2` ويكبر بـ `sm:`/`lg:`. حقول التاريخ/الوقت جنب بعض تبقى `grid-cols-1 sm:grid-cols-2`.
- الصف اللي فيه نص + أزرار: `flex-col sm:flex-row` أو `flex-wrap` — الأزرار متتضغطش بجنب النص على موبايل.
- الجداول: `overflow-x-auto` + `min-w-[...]` على الـ `<table>`. لو الجدول صفحة أساسية للـ agent (زي My Leads) اعرضه كـ cards تحت `md`.
- الـ dropdown اللي عرضه ثابت (زي الإشعارات) يبقى `fixed left-2 right-2` على الموبايل و`sm:absolute sm:w-80` من `sm`.
- الـ inputs على الموبايل 16px (قاعدة في `index.css`) عشان iOS ميعملش zoom.

## Collapsible (السهم اللي بيفتح ويقفل)

أي حاجة ليها أولاد (مانجر ← تيمز ← agents، update ← مين ردّ، task ← مين خلّصها، TL ← agents) بتتعرض بـ `shared/components/Collapsible.tsx`: الـ header دايمًا ظاهر وجنبه سهم، والضغط عليه يفتح/يقفل المحتوى. مستخدم في: Teams، Sales، Dashboard الـ OM، Team Updates، Tasks، Send Tip. القايمة الطويلة المقفولة افتراضيًا بـ `DoneSection` (Completed / Acknowledged / Got it).

## Teams: ترتيب الكروت

الـ OM هو header البانل، وتحته grid عادي (`sm:grid-cols-2 xl:grid-cols-3`). أول 3 تيمز على صف (شمال، نص، يمين)، والرابع يبدأ صف جديد من الشمال وهكذا. مفيش خطوط توصيل.
