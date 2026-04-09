import { ObjectId } from 'mongodb';
import { db } from '@/lib/database';
import Constants from '@/lib/constants';

export class ToolMachineryModel {
  static collectionName = Constants.TOOLS_MACHINERY_COLLECTION;

  static async findAll(query = {}) {
    await db.connect();
    return db._instance
      .collection(this.collectionName)
      .find(query)
      .sort({ isActive: -1, name: 1 })
      .toArray();
  }

  static async findById(id) {
    await db.connect();
    return db._instance
      .collection(this.collectionName)
      .findOne({ _id: new ObjectId(id) });
  }

  static async findByName(name, excludeId = null) {
    await db.connect();
    const query = { name: name.trim() };
    if (excludeId) {
      query._id = { $ne: new ObjectId(excludeId) };
    }
    return db._instance.collection(this.collectionName).findOne(query);
  }

  static async create(data) {
    await db.connect();
    const doc = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db._instance.collection(this.collectionName).insertOne(doc);
    return { insertedId: result.insertedId, tool: { _id: result.insertedId, ...doc } };
  }

  static async updateById(id, updateData) {
    await db.connect();
    return db._instance.collection(this.collectionName).updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  }

  static async deleteById(id) {
    await db.connect();
    return db._instance.collection(this.collectionName).deleteOne({ _id: new ObjectId(id) });
  }
}
