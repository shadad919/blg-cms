import { MongoClient, Db, Collection } from 'mongodb'

if (!process.env.MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local')
}

const uri = process.env.MONGO_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Helper function to get database
export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db('blg_db')
}

// Helper function to get posts collection
export async function getPostsCollection(): Promise<Collection> {
  const db = await getDb()
  return db.collection('posts')
}

// Helper function to get admins collection
export async function getAdminsCollection(): Promise<Collection> {
  const db = await getDb()
  return db.collection('admins')
};

export async function getUsersCollection(): Promise<Collection> {
  const db = await getDb()
  return db.collection('users')
};

export async function getCategoriesCollection(): Promise<Collection> {
  const db = await getDb()
  return db.collection('categories');
};


export default clientPromise
