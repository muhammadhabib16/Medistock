import Database from "@tauri-apps/plugin-sql";

export async function initializeDatabase() {
  // Membuka atau membuat file database 'apotek.db' di direktori data aplikasi
  const db = await Database.load("sqlite:apotek.db");

  // Membuat tabel-tabel menggunakan transaksi agar aman
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS drugs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      sku TEXT UNIQUE,
      current_stock INTEGER DEFAULT 0,
      unit TEXT NOT NULL,
      price REAL NOT NULL,
      min_stock INTEGER DEFAULT 5,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );    
    
    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drug_id INTEGER,
      supplier_id INTEGER,
      user_id INTEGER,
      type TEXT CHECK(type IN ('IN', 'OUT')),
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      doc_no TEXT,
      batch_no TEXT,
      expired_date TEXT,
      deliverer TEXT,
      receiver TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY(drug_id) REFERENCES drugs(id),
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Jalankan migrasi mandiri untuk menambahkan min_stock jika tabel sudah pernah dibuat sebelumnya tanpa kolom tersebut
  try {
    await db.select("SELECT min_stock FROM drugs LIMIT 1");
  } catch (err) {
    try {
      await db.execute("ALTER TABLE drugs ADD COLUMN min_stock INTEGER DEFAULT 5");
      console.log("Kolom min_stock berhasil ditambahkan ke tabel drugs!");
    } catch (alterErr) {
      console.error("Gagal menambahkan kolom min_stock ke tabel drugs:", alterErr);
    }
  }

  // Jalankan migrasi mandiri untuk menambahkan kolom baru ke stock_transactions jika belum ada
  const newCols = [
    { name: 'doc_no', type: 'TEXT' },
    { name: 'batch_no', type: 'TEXT' },
    { name: 'expired_date', type: 'TEXT' },
    { name: 'deliverer', type: 'TEXT' },
    { name: 'receiver', type: 'TEXT' }
  ];

  for (const col of newCols) {
    try {
      await db.select(`SELECT ${col.name} FROM stock_transactions LIMIT 1`);
    } catch (err) {
      try {
        await db.execute(`ALTER TABLE stock_transactions ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Kolom ${col.name} berhasil ditambahkan ke tabel stock_transactions!`);
      } catch (alterErr) {
        console.error(`Gagal menambahkan kolom ${col.name}:`, alterErr);
      }
    }
  }

  // Jalankan migrasi mandiri untuk menambahkan kolom keamanan ke tabel users jika belum ada
  try {
    await db.select("SELECT security_question FROM users LIMIT 1");
  } catch (err) {
    try {
      await db.execute("ALTER TABLE users ADD COLUMN security_question TEXT");
      await db.execute("ALTER TABLE users ADD COLUMN security_answer TEXT");
      // Set default security question & answer untuk default admin
      await db.execute(
        "UPDATE users SET security_question = ?, security_answer = ? WHERE username = 'admin'",
        ["Apa nama apotek ini?", "apotek abc"]
      );
      console.log("Kolom security_question & security_answer berhasil ditambahkan ke tabel users!");
    } catch (alterErr) {
      console.error("Gagal menambahkan kolom keamanan ke tabel users:", alterErr);
    }
  }

  await seedData(db);

  console.log("Database & Tabel berhasil dipersiapkan, Bos!");
}

async function seedData(db: any) {
  try {
    // Seed default admin user jika tidak ada user sama sekali di database
    const users: any[] = await db.select("SELECT id FROM users LIMIT 1");
    if (users.length === 0) {
      await db.execute(
        "INSERT INTO users (username, password, role, security_question, security_answer) VALUES (?, ?, ?, ?, ?)",
        ["admin", "admin123", "admin", "Apa nama apotek ini?", "apotek abc"],
      );
      console.log("Akun Admin default berhasil dibuat");
    }
  } catch (error) {
    console.error("Gagal melakukan seeding data admin default:", error);
  }
}
