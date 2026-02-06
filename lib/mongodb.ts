import { MongoClient, Db, Collection } from 'mongodb'

const options = {}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error(
      'Please define the MONGO_URI environment variable (e.g. in .env.local or your host\'s env settings).'
    )
  }

  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options)
      globalWithMongo._mongoClientPromise = client.connect()
    }
    return globalWithMongo._mongoClientPromise
  }

  const client = new MongoClient(uri, options)
  return client.connect()
}

// Lazy singleton so we don't require MONGO_URI at build time (e.g. Netlify)
let _clientPromise: Promise<MongoClient> | null = null
function clientPromise(): Promise<MongoClient> {
  if (!_clientPromise) _clientPromise = getClientPromise()
  return _clientPromise
}

// Helper function to get database
export async function getDb(): Promise<Db> {
  const client = await clientPromise()
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
  return db.collection('categories')
}

export async function getSettingsCollection(): Promise<Collection> {
  const db = await getDb()
  return db.collection('settings')
}

// Thenable so "await clientPromise" still works; connection is lazy (no MONGO_URI needed at build)
export default {
  then(onFulfilled?: (c: MongoClient) => unknown, onRejected?: (err: unknown) => unknown) {
    return clientPromise().then(onFulfilled, onRejected)
  },
  catch(onRejected?: (err: unknown) => unknown) {
    return clientPromise().catch(onRejected)
  },
}
