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
- Sidebar: أبيض، `w-60` ثابت على الشاشات الكبيرة (`lg`+). تحت `lg` بيتحول لـ drawer بيفتح من زرار الهامبرجر في الـ top bar ويتقفل بالضغط بره أو Escape أو لما تختار صفحة

## Breakpoints

mobile-first: `sm 640` · `md 768` · `lg 1024`. الـ Sidebar بيتحوّل لـ drawer تحت `lg`.

قواعد الـ responsive: الـ padding `p-4 sm:p-6`، الـ headers `flex-wrap gap-3`، الفورمز `grid-cols-1 sm:grid-cols-2`، الجداول جوه `overflow-x-auto`، الـ modals `max-h-[92dvh] overflow-y-auto` و`px-4 sm:px-6`، والـ dropdowns (الجرس) بتبقى `fixed` بعرض الشاشة على الموبايل.

## Collapsible (السهم اللي بيفتح ويقفل)

أي حاجة ليها أولاد (مانجر ← تيمز ← agents، update ← مين ردّ، task ← مين خلّصها، TL ← agents) بتتعرض بـ `shared/components/Collapsible.tsx`: الـ header دايمًا ظاهر وجنبه سهم، والضغط عليه يفتح/يقفل المحتوى. مستخدم في: Teams، Sales، Dashboard الـ OM، Team Updates، Tasks، Send Tip. القايمة الطويلة المقفولة افتراضيًا بـ `DoneSection` (Completed / Acknowledged / Got it).

## Teams: ترتيب الكروت

الـ OM هو header البانل، وتحته grid عادي (`sm:grid-cols-2 xl:grid-cols-3`). أول 3 تيمز على صف (شمال، نص، يمين)، والرابع يبدأ صف جديد من الشمال وهكذا. مفيش خطوط توصيل.
