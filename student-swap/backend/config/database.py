import os
import psycopg2
import psycopg2.pool
import psycopg2.extras

_pool = None
_init_error = None


def init_pool():
    global _pool, _init_error
    try:
        url = os.environ.get("DATABASE_URL", "")
        if not url or "username:password@host" in url:
            _init_error = "DATABASE_URL is not configured. Edit backend/.env and set a real PostgreSQL connection string."
            print(f"\n[DB] WARNING: {_init_error}\n")
            return
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=url,
            sslmode="require" if os.environ.get("FLASK_ENV") == "production" else "prefer",
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5,
        )
        _init_error = None
        print("[DB] Connected to database successfully")
    except Exception as e:
        _init_error = str(e)
        print(f"\n[DB] Connection failed: {e}\n")


def get_conn():
    if _pool is None:
        raise ConnectionError(_init_error or "Database not initialized. Check DATABASE_URL in backend/.env")
    conn = _pool.getconn()
    try:
        conn.cursor().execute("SELECT 1")
    except Exception:
        # Connection went stale (Neon auto-suspend). Close it and get a fresh one.
        try:
            _pool.putconn(conn, close=True)
        except Exception:
            pass
        conn = _pool.getconn()
    return conn


def put_conn(conn):
    if _pool is not None:
        _pool.putconn(conn)


class DB:
    """Context manager that grabs a connection, yields a dict cursor, auto-commits/rolls back."""

    def __init__(self):
        self.conn = None
        self.cur = None

    def __enter__(self):
        self.conn = get_conn()
        self.cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        else:
            self.conn.commit()
        self.cur.close()
        put_conn(self.conn)

    def execute(self, sql, params=None):
        self.cur.execute(sql, params)

    def fetchone(self, sql, params=None):
        self.cur.execute(sql, params)
        return self.cur.fetchone()

    def fetchall(self, sql, params=None):
        self.cur.execute(sql, params)
        return self.cur.fetchall()

    def fetchval(self, sql, params=None):
        self.cur.execute(sql, params)
        row = self.cur.fetchone()
        return list(row.values())[0] if row else None
