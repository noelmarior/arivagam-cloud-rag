# ARIVAGAM UI/UX SPECIFICATION v2.1
**Design Philosophy:** "Modern Academic SaaS" (Inspired by Linear, Apple, & Kaggle).
**Core Constraint:** Minimalist, Whitespace-heavy, Dynamic Color Identity.

---

## 1. Layout & Physics (The "Floating" Sidebar)
Instead of a hard border, the sidebar "floats" to create depth.

* **Global Background:** `bg-gray-50` (The canvas).
* **Sidebar Component:**
    * **Position:** Fixed Left (`fixed left-0 top-0 h-screen w-64`).
    * **Outer Padding:** `p-3` (Creates the "gap" from the edge).
    * **Inner Container:** `h-full w-full bg-white rounded-2xl shadow-sm border border-gray-100`.
    * **Visual Logic:** It should look like a "card" hovering on the gray canvas, distinct from the main workspace.
    * **Typography:** Uppercase, tracked (`tracking-wider`) headers in `text-xs text-gray-400`.
    * **Active State:** `bg-gray-50 text-gray-900 font-medium`.

---

## 2. Dynamic Color System (File Identity)
The UI adapts its accent color based on the active file type.

| File Type | Tailwind Color Family | Hex (Ref) | Used In |
| :--- | :--- | :--- | :--- |
| **PDF** | `red` | #EF4444 | Icon, "Start Session" Button, Summary Border |
| **DOC/DOCX** | `blue` | #3B82F6 | Icon, "Start Session" Button, Summary Border |
| **XLS/CSV** | `emerald` | #10B981 | Icon, "Start Session" Button, Summary Border |
| **MP4/MOV** | `violet` | #8B5CF6 | Icon, "Start Session" Button, Summary Border |
| **Default** | `gray` | #6B7280 | Fallback |

* **Implementation Rule:**
    * **Icons:** `text-{color}-600`.
    * **Buttons:** `bg-{color}-600 hover:bg-{color}-700 text-white`.
    * **AI Summary Box:** `border-l-4 border-{color}-500 bg-{color}-50`.

---

## 3. Micro-Interactions (The "Levitation" Effect)
Folder and File cards must feel tactile. On hover, they should physically "lift."

* **Target Components:** `FolderCard`, `FileCard`.
* **Physics Class:**
    ```css
    transition-all duration-300 ease-out
    hover:-translate-y-1
    hover:shadow-md
    hover:border-gray-300
    cursor-pointer
    ```
* **Result:** A subtle lift (4px) paired with a growing shadow creates a 3D effect.

---

## 4. Auth Screens (The "Kaggle" Vibe)
Split-screen layout to maximize professional appeal.

* **Left Column (Interaction):**
    * Centered Login/Register Form.
    * Minimalist inputs: `border-b border-gray-300 focus:border-black` (No boxy outlines).
    * Typography: `Inter`, clean and spacious.
* **Right Column (Storytelling):**
    * Background: Soft gradient or subtle pattern (`bg-slate-50`).
    * **Imagery:** Use **unDraw** SVGs (Open Source).
        * *Login:*  (`undraw_exams_g4ow.svg`)
        * *Register:*  (`undraw_learning_sketching_nd4f.svg`)
    * **Content:**
        * Header: "Transform your coursework into conversation."
        * Testimonials/Stats: "Join 500+ students mastering Data Structures."

---

## 5. Typography
* **Font Family:** `Inter` (Google Fonts).
* **Hierarchy:**
    * Page Titles: `text-2xl font-bold tracking-tight text-gray-900`.
    * Body Text: `text-base text-gray-600 leading-relaxed`.
    * Meta Data: `text-xs text-gray-400`.