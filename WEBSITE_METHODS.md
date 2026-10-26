# THS Medical Center Website — Technologies aur Methods

Yeh document website mein istemal ki gayi technology aur development methods ka short overview hai.

## Technology stack

- **Next.js 16 App Router** — pages, routing, layouts aur production build.
- **React 19** — interactive forms, tables aur reusable user-interface components.
- **TypeScript** — data types aur code ke errors ko pehle pakarne ke liye.
- **Tailwind CSS 4** — page layout, colors, responsive design aur styling.
- **Firebase Authentication** — email aur password se admin sign-in.
- **Cloud Firestore** — medicines, suppliers, stock movements, patient visits, school students aur rent items ka shared database.
- **Firebase Hosting configuration** — `firebase.json` mein Next.js hosting source aur Firestore rules ka path set hai.
- **XLSX, jsPDF aur jsPDF AutoTable** — reports ko Excel aur PDF mein export karne ke liye.

## Website ka structure

- `app/` mein home, login aur dashboard ke pages hain. `(panel)` group ke andar reception, doctor, medicines, stock, reports, rent aur school-students ke pages hain.
- `components/` mein common shell, forms, medicine autocomplete aur shared store state hai.
- `lib/` mein Firebase setup, data types, medicine/stock helpers, validation aur report export logic rakha gaya hai.
- `firestore.rules` mein har collection ke read/write rules hain. Admin ka UID `admins/{uid}` document mein hona chahiye.

## Data aur login ka tareeqa

1. User Firebase Authentication ke account se login karta hai.
2. Login ke baad app `admins/{uid}` record check karta hai. Admin record ke baghair protected pages nahi khulte.
3. Firestore data active page ke mutabiq load hota hai. Misal ke taur par School Students page par student records aur Doctor/Reception pages par patient visits subscribe hote hain.
4. Stock changes Firestore transaction mein medicine quantity aur stock movement ko saath update karte hain.
5. School-student record Firestore mein save hota hai aur uski fee zero hoti hai.

## Speed ke liye tareeqe

- Har page par tamam Firestore collections load nahi hote; sirf us page ko chahiye data subscribe hota hai.
- Excel/PDF libraries report export button dabane ke baad hi load hoti hain.
- Firestore listeners page chhorne par unsubscribe hote hain.

## Local development aur commands

Firebase web configuration `.env.local` mein hai. Ismein Firebase account ka password nahi rakha jata; password Firebase Authentication mein manage hota hai. Environment file badalne ke baad local dev server restart karna hota hai.

```bash
npm install
npm run dev
npm run build
npm run start
```

## Deploy se pehle

- Firebase Authentication mein Email/Password sign-in enabled ho.
- Authentication provider set karne ke liye pehle `firebase login` aur phir `firebase deploy --only auth --project ths-medical1` chalayein.
- Login email ka Firebase Authentication user bana ho.
- Us user ke UID ke liye Firestore mein `admins/{uid}` document aur `role: "admin"` ho.
- `firestore.rules` Firebase project par deploy hon.
- `NEXT_PUBLIC_FIREBASE_*` values usi Firebase project ke hon aur production build ke waqt set hon.

`.env.local` ko source control mein commit na karein. Is project mein woh `.gitignore` se excluded hai. Deployment service par environment variables set karein; login password ko environment file ya WhatsApp par share na karein.
