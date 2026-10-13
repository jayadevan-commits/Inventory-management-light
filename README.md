# Inventory Management System (Lite)

A locally runnable inventory app: **FastAPI** (Python) + **MySQL** (raw SQL) + **React** (TypeScript).
Manage products, categories and suppliers, adjust stock with a full transaction history, and see what needs restocking on a dashboard.

- No authentication, no Docker, no cloud. Local development only.
- Every screen reads and writes real data through the API. Nothing is hardcoded.

## What you can do

| Area | Features |
|---|---|
| Dashboard | Total products, total units in stock, low-stock count, out-of-stock count, a restock list and recent stock changes |
| Products | Create, view, edit, delete, search by name or SKU, filter by category and stock level, pagination (10 per page) |
| Categories / Suppliers | Create, view, edit, delete (blocked while products still use them) |
| Stock | Add or remove stock, see the full transaction history, stock can never go below zero |

**Stock levels:** *Out of stock* = 0 units. *Low stock* = 1 unit up to the product's reorder level. *In stock* = above the reorder level.

---

## Project layout

```
inventory-management/
├── README.md
├── .gitignore
├── backend/
│   ├── main.py                 App entry point (CORS, request logging, routers)
│   ├── config.py               Settings read from .env
│   ├── database.py             MySQL pool, schema setup, transaction helper
│   ├── logging_config.py       Console + rotating log files
│   ├── schema.sql              All tables, keys, indexes, constraints
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/                 Thin API endpoints
│   ├── schemas/                Request validation + response models (Pydantic)
│   ├── services/               Business rules (duplicate checks, stock rules)
│   ├── repositories/           Raw parameterized SQL only
│   ├── exceptions/             Error classes + central error handlers
│   └── utils/                  Response helper, pagination helper
└── frontend/
    ├── package.json
    ├── vite.config.ts          Dev server + proxy to the backend
    └── src/
        ├── api/                Typed API client
        ├── components/         Modal, forms, toasts, pagination, layout
        ├── hooks/              useAsync, useDebounce
        └── pages/              Dashboard, Products, Stock, Categories, Suppliers
```

How a request flows: **route** (validates input, returns the response) → **service** (business rules) → **repository** (SQL). Routes never contain SQL and repositories never contain business rules.

---

## 1. Install the prerequisites

Install these once (Windows):

1. **Python 3.10 or newer** from https://www.python.org/downloads/ . On the first installer screen, tick **Add python.exe to PATH**.
2. **MySQL Community Server 8.0.16 or newer** and **MySQL Workbench** from https://dev.mysql.com/downloads/ (the MySQL Installer for Windows installs both). Remember the **root password** you set. Older versions (5.7) do not enforce the CHECK constraints this project uses.
3. **Node.js 18 or newer (LTS)** from https://nodejs.org/ .

Check the installs in a new PowerShell window:

```powershell
python --version
node --version
npm --version
```

## 2. Create a Python virtual environment

```powershell
cd inventory-management\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Your prompt now starts with `(.venv)`.
Using Command Prompt instead? Activate with `.venv\Scripts\activate.bat`.

## 3. Install backend dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 4. Configure the database and the `.env` file

Create your own `.env` from the example and open it:

```powershell
copy .env.example .env
notepad .env
```

Set at least `DB_PASSWORD` to your MySQL root password (and `DB_USER` if you do not use `root`):

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=inventory_db
AUTO_INIT_SCHEMA=true
```

`.env` is listed in `.gitignore`, so your password is never committed. Restart the backend after changing it.

## 5. Create the tables (pick one way)

**Option A: automatic (default).** Leave `AUTO_INIT_SCHEMA=true`. When the backend starts it creates the database and any missing tables from `schema.sql`. Nothing is ever dropped or overwritten, so restarting is always safe.

**Option B: manual with MySQL Workbench.**
1. Open Workbench and connect to your local MySQL.
2. Choose **File > Open SQL Script**, select `backend\schema.sql`.
3. Click the lightning-bolt **Execute** button.
4. In `.env` set `AUTO_INIT_SCHEMA=false`.

`schema.sql` can be run any number of times; it only creates what is missing. If you change the database name inside it, change `DB_NAME` in `.env` to match.

## 6. Start the backend

From the `backend` folder with the virtual environment active:

```powershell
uvicorn main:app --reload
```

Look for these lines:

```
Database schema checked (database 'inventory_db')
Connected to MySQL at localhost:3306 (pool size 10)
Application startup complete.
```

Quick check: open http://127.0.0.1:8000/api/v1/health . You should see `"success": true`.

Logs are written to `backend\logs\app.log` (everything) and `backend\logs\errors.log` (warnings, database errors, unexpected exceptions).

## 7. Start the frontend

Open a **second** PowerShell window:

```powershell
cd inventory-management\frontend
npm install
npm run dev
```

Open http://localhost:5173 . The dev server forwards every `/api` call to the backend on port 8000, so no CORS setup or extra configuration is needed.

## 8. Test the API with Swagger UI

1. Open http://127.0.0.1:8000/docs .
2. Expand **POST /api/v1/categories**, click **Try it out**, send `{"name": "Electronics"}`.
3. Expand **POST /api/v1/products** and send:
   ```json
   { "sku": "USB-001", "name": "USB-C Cable", "category_id": 1, "unit_price": "199.50", "reorder_level": 5, "initial_stock": 10 }
   ```
4. Expand **POST /api/v1/stock/adjust** and send:
   ```json
   { "product_id": 1, "transaction_type": "OUT", "quantity": 4, "reason": "Sold" }
   ```
5. Try removing 100 units. You get a `400` with `"success": false` and a clear message, and the stock is unchanged.

Every response uses the same shape:

```json
{ "success": true,  "message": "Product created successfully", "data": { } }
{ "success": false, "message": "Product not found",            "data": null }
```

| Status | Meaning |
|---|---|
| 200 / 201 | Success / created |
| 400 | Business rule broken (for example, not enough stock) |
| 404 | Record not found |
| 409 | Conflict (duplicate name or SKU, or record still in use) |
| 422 | Validation failed; the message lists each problem |
| 500 / 503 | Unexpected error / database unavailable. Details go to the log, never to the client |

Main endpoints (all under `/api/v1`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard` | Dashboard numbers |
| GET | `/products?page=&page_size=&search=&category_id=&supplier_id=&stock_status=` | List, search, filter, paginate |
| GET / POST | `/products`, `/products/{id}` | Read, create (`initial_stock` optional) |
| PUT / DELETE | `/products/{id}` | Update, delete |
| GET / POST / PUT / DELETE | `/categories`, `/suppliers` (and `/{id}`) | Manage categories and suppliers |
| POST | `/stock/adjust` | Add (`IN`) or remove (`OUT`) stock |
| GET | `/stock/transactions?product_id=&transaction_type=` | Stock history |
| GET | `/health` | API and database check |

## 9. Verify the full workflow (frontend → backend → database)

1. In the app, open **Categories** and click **Add category**. Create "Electronics".
2. Open **Suppliers** and add a supplier.
3. Open **Products**, click **Add product**, pick the category and supplier, set a reorder level of 5 and starting stock of 10, then create it. A green notification confirms it.
4. Open **Stock**, pick the product, choose **Remove stock**, enter 4 and save. The stock becomes 6 and a new row appears in the history.
5. Enter 100 under **Remove stock**. The form refuses it and the stock stays at 6.
6. Remove 2 more (stock 4, below the reorder level). Open the **Dashboard**: the product now appears under **Needs restocking** and the low-stock card shows 1.
7. Confirm it is really in MySQL. In Workbench run:
   ```sql
   USE inventory_db;
   SELECT id, sku, name, quantity FROM products;
   SELECT product_id, transaction_type, quantity, quantity_before, quantity_after, reason, created_at
   FROM stock_transactions ORDER BY id DESC;
   ```
   You should see the product with its current quantity and one row per stock change, including the "Initial stock" entry.
8. Stop and restart the backend. Your data is still there.

---

## Design decisions worth knowing

- **Stock is changed in one place.** The product edit form does not touch quantity. Every change goes through `/stock/adjust`, which locks the product row, checks the rule, updates the quantity and writes the transaction in a single database transaction. Two people changing the same product at once cannot oversell it.
- **Negative stock is blocked three times:** by the form, by the service, and by the database (`UNSIGNED` column plus a CHECK constraint).
- **Deleting a category or supplier** is refused while products use it. **Deleting a product** also deletes its stock history (a confirmation dialog warns about this).
- **SKUs** are stored in upper case, cannot contain spaces and must be unique. Category and supplier names are unique ignoring case.
- **Prices** use `DECIMAL(10,2)`, so there are no floating-point rounding surprises. The currency symbol is not shown; add one in `frontend/src/utils/format.ts` if you want it.
- **Search** treats `%` and `_` as ordinary characters.

---

## Troubleshooting

**`python` or `pip` is not recognized.** Reinstall Python and tick *Add python.exe to PATH*, or try `py -m venv .venv` and `py -m pip install -r requirements.txt`. Open a new terminal afterwards.

**"running scripts is disabled on this system" when activating the venv.** Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt and `.venv\Scripts\activate.bat`.

**`pip install` fails.** Run `python -m pip install --upgrade pip` and try again. Use Python 3.10 to 3.13.

**`ModuleNotFoundError: No module named 'config'` (or `routes`, `database`).** Run `uvicorn` from inside the `backend` folder, not from the project root.

**`Access denied for user 'root'@'localhost'` (error 1045).** `DB_USER` or `DB_PASSWORD` in `.env` is wrong. Confirm the same login works in MySQL Workbench, then restart the backend.

**`Can't connect to MySQL server` (error 2003) or the API returns 503.** MySQL is not running. Press Win+R, run `services.msc`, find **MySQL80** (the name can differ) and start it. Also check `DB_HOST` and `DB_PORT`. Details are in `backend\logs\errors.log`.

**`Unknown database 'inventory_db'` (error 1049).** You set `AUTO_INIT_SCHEMA=false` but have not imported `schema.sql` yet. Import it in Workbench (step 5, option B) or set `AUTO_INIT_SCHEMA=true`.

**`Access denied ... to database` or `CREATE command denied` (error 1044 / 1142).** The MySQL user cannot create databases. Create `inventory_db` in Workbench with an admin account, import `schema.sql`, and set `AUTO_INIT_SCHEMA=false`.

**Errors about CHECK or `UNSIGNED` while importing `schema.sql`.** Your MySQL is older than 8.0.16. Upgrade to MySQL 8.

**Port 8000 or 5173 is already in use.** Find the process with `netstat -ano | findstr :8000`, stop it with `taskkill /PID <number> /F`, or run the backend on another port (`uvicorn main:app --reload --port 8001`) and put `VITE_BACKEND_URL=http://127.0.0.1:8001` in `frontend\.env` (copy `frontend\.env.example`), then restart `npm run dev`.

**`npm` is not recognized.** Install Node.js LTS and open a new terminal.

**The app shows "Cannot reach the server".** The backend is not running, or it is on a different port. Open http://127.0.0.1:8000/api/v1/health in the browser to check.

**Changes to `.env` do nothing.** Stop the backend (Ctrl+C) and start it again. For `frontend\.env`, restart `npm run dev`.

**Fonts look different.** The UI loads Barlow from Google Fonts. Offline, it falls back to your system font; everything still works.
