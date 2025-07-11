import sqlite3 from 'sqlite3';
import { Order } from '../types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class OrderService {
  private static instance: OrderService;
  private db: sqlite3.Database;
  private dbReady: Promise<void>;
  
  constructor() {
    const dbPath = path.join(process.cwd(), 'orders.db');
    this.db = new sqlite3.Database(dbPath);
    this.dbReady = this.initDatabase();
  }
  
  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }
  
  private initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // First create table if it doesn't exist
      this.db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          tokenAddress TEXT NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          usdAmount REAL,
          targetPrice REAL NOT NULL,
          status TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          executedAt TEXT,
          txSignature TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Failed to create orders table:', err);
          reject(err);
          return;
        }
        
        // Then check if columns exist and add them if not
        this.db.all("PRAGMA table_info(orders)", (err, columns: any[]) => {
          if (err) {
            console.error('Failed to check table schema:', err);
            reject(err);
            return;
          }
          
          const hasUsdAmount = columns.some(col => col.name === 'usdAmount');
          const hasSolAmount = columns.some(col => col.name === 'solAmount');
          const hasSlippage = columns.some(col => col.name === 'slippage');
          
          // Chain migrations
          const runMigrations = async () => {
            try {
              if (!hasUsdAmount) {
                console.log('Adding usdAmount column...');
                await new Promise<void>((res, rej) => {
                  this.db.run('ALTER TABLE orders ADD COLUMN usdAmount REAL', (err) => {
                    if (err) rej(err);
                    else res();
                  });
                });
              }
              
              if (!hasSolAmount) {
                console.log('Adding solAmount column...');
                await new Promise<void>((res, rej) => {
                  this.db.run('ALTER TABLE orders ADD COLUMN solAmount REAL', (err) => {
                    if (err) rej(err);
                    else res();
                  });
                });
              }
              
              if (!hasSlippage) {
                console.log('Adding slippage column...');
                await new Promise<void>((res, rej) => {
                  this.db.run('ALTER TABLE orders ADD COLUMN slippage REAL', (err) => {
                    if (err) rej(err);
                    else res();
                  });
                });
              }
              
              console.log('Orders table ready');
              resolve();
            } catch (error) {
              console.error('Migration failed:', error);
              reject(error);
            }
          };
          
          runMigrations();
        });
      });
    });
  }
  
  async createOrder(orderData: Omit<Order, 'id' | 'status' | 'createdAt'>): Promise<Order> {
    await this.dbReady; // Wait for DB to be ready
    
    const order: Order = {
      id: uuidv4(),
      ...orderData,
      status: 'pending',
      createdAt: new Date()
    };
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO orders (id, token, tokenAddress, type, amount, usdAmount, solAmount, targetPrice, slippage, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.token,
          order.tokenAddress,
          order.type,
          order.amount,
          order.usdAmount || null,
          order.solAmount || null,
          order.targetPrice,
          order.slippage || null,
          order.status,
          order.createdAt.toISOString()
        ],
        (err) => {
          if (err) reject(err);
          else resolve(order);
        }
      );
    });
  }
  
  async getActiveOrders(): Promise<Order[]> {
    await this.dbReady; // Wait for DB to be ready
    
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM orders WHERE status = 'pending' ORDER BY createdAt DESC`,
        [],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const orders = rows.map(row => ({
              ...row,
              createdAt: new Date(row.createdAt),
              executedAt: row.executedAt ? new Date(row.executedAt) : undefined
            }));
            resolve(orders);
          }
        }
      );
    });
  }
  
  async getOrder(orderId: string): Promise<Order | null> {
    await this.dbReady; // Wait for DB to be ready
    
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM orders WHERE id = ?`,
        [orderId],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            const order = {
              ...row,
              createdAt: new Date(row.createdAt),
              executedAt: row.executedAt ? new Date(row.executedAt) : undefined
            };
            resolve(order);
          }
        }
      );
    });
  }
  
  async updateOrderStatus(
    orderId: string, 
    status: Order['status'], 
    txSignature?: string
  ): Promise<void> {
    await this.dbReady; // Wait for DB to be ready
    
    return new Promise((resolve, reject) => {
      const executedAt = status === 'executed' ? new Date().toISOString() : null;
      
      this.db.run(
        `UPDATE orders 
         SET status = ?, executedAt = ?, txSignature = ?
         WHERE id = ?`,
        [status, executedAt, txSignature || null, orderId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
  
  async cancelOrder(orderId: string): Promise<Order> {
    await this.dbReady; // Wait for DB to be ready
    
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.status !== 'pending') {
      throw new Error('Can only cancel pending orders');
    }
    
    await this.updateOrderStatus(orderId, 'cancelled');
    return { ...order, status: 'cancelled' };
  }
  
  async getOrderStats(): Promise<{
    active: number;
    executed: number;
    cancelled: number;
    failed: number;
    total: number;
  }> {
    await this.dbReady; // Wait for DB to be ready
    
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT status, COUNT(*) as count FROM orders GROUP BY status`,
        [],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const stats = {
              active: 0,
              executed: 0,
              cancelled: 0,
              failed: 0,
              total: 0
            };
            
            rows.forEach(row => {
              stats.total += row.count;
              switch (row.status) {
                case 'pending':
                  stats.active = row.count;
                  break;
                case 'executed':
                  stats.executed = row.count;
                  break;
                case 'cancelled':
                  stats.cancelled = row.count;
                  break;
                case 'failed':
                  stats.failed = row.count;
                  break;
              }
            });
            
            resolve(stats);
          }
        }
      );
    });
  }
  
  async getOrdersByToken(tokenAddress: string): Promise<Order[]> {
    await this.dbReady; // Wait for DB to be ready
    
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM orders WHERE tokenAddress = ? AND status = 'pending'`,
        [tokenAddress],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const orders = rows.map(row => ({
              ...row,
              createdAt: new Date(row.createdAt),
              executedAt: row.executedAt ? new Date(row.executedAt) : undefined
            }));
            resolve(orders);
          }
        }
      );
    });
  }
}