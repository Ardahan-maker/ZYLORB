// MongoDB Database Connection for ZYLORB
const { MongoClient } = require('mongodb');

class Database {
    constructor() {
        this.uri = "mongodb+srv://zylorb:zylorb123@cluster0.mongodb.net/zylorb?retryWrites=true&w=majority";
        this.client = new MongoClient(this.uri);
        this.db = null;
        this.init();
    }

    async init() {
        try {
            await this.client.connect();
            this.db = this.client.db('zylorb');
            console.log('✅ MongoDB Connected Successfully');
        } catch (error) {
            console.log('❌ MongoDB Connection Failed - Using in-memory database');
            this.db = null;
        }
    }

    async insertUser(userData) {
        if (this.db) {
            return await this.db.collection('users').insertOne(userData);
        }
        return null;
    }

    async findUser(query) {
        if (this.db) {
            return await this.db.collection('users').findOne(query);
        }
        return null;
    }

    async insertPost(postData) {
        if (this.db) {
            return await this.db.collection('posts').insertOne(postData);
        }
        return null;
    }

    async findPosts(query) {
        if (this.db) {
            return await this.db.collection('posts').find(query).sort({ createdAt: -1 }).limit(20).toArray();
        }
        return [];
    }

    async updateUser(query, update) {
        if (this.db) {
            return await this.db.collection('users').updateOne(query, update);
        }
        return null;
    }
}

module.exports = new Database();
