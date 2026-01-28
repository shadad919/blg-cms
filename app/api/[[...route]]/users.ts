import { getPostsCollection, getUsersCollection } from '@/lib/mongodb';
import { Hono } from 'hono';
import { ApiResponse } from '@/lib/types';
import { ObjectId } from 'mongodb';
const users = new Hono();


users.get('/', async (c) => {
  const usersCollection = await getUsersCollection();
  const users = await usersCollection.find({}).toArray();
  return c.json<ApiResponse<any[]>>({
    result: users,
    result_message: {
      title: 'Success',
      type: 'OK',
      message: 'Users fetched successfully',
    },
  });
});


users.get('/:id', async (c) => {
  const usersCollection = await getUsersCollection();
  const id = c.req.param('id') as string;
  const postsCollection = await getPostsCollection();
  const total = await postsCollection.countDocuments({ authorId: id });
  const user = await usersCollection.findOne({ id: id });
  return c.json<ApiResponse<any>>(
    {
      result: {...user, posts: total || 0},
      result_message: {
        title: 'Success',
        type: 'OK',
        message: 'User fetched successfully',
      },
    },
    200
  );
});


users.post('/:id', async (c) => {
  const usersCollection = await getUsersCollection();
  const data = await c.req.json();
  const user = await usersCollection.insertOne({
    id: c.req.param('id') as string,
    device_type: data.device_type as string,
    os_version: data.os_version as string,
    app_version: data.app_version as string,
    language: data.language as string,
    token: null,
    createdAt: new Date().toISOString(),
  });
  return c.json<ApiResponse<any>>(
    {
      result: user,
      result_message: {
        title: 'Success',
        type: 'OK',
        message: 'User created successfully',
      },
    },
    201
  );
});

users.put('/:id', async (c) => {
  const usersCollection = await getUsersCollection();
  const id = c.req.param('id') as string;
  const data = await c.req.json();
  const user = await usersCollection.updateOne({ id: id }, { $set: data.token ? { token: data.token } : {} });
  return c.json<ApiResponse<any>>(
    {
      result: user,
      result_message: {
        title: 'Success',
        type: 'OK',
        message: 'User updated successfully',
      },
    },
    200
  );
});

export default users;