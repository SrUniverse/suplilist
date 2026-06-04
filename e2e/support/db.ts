import mongoose from 'mongoose';

export async function connectTestDB(workerIndex: string) {
    // Cria um banco de dados exclusivo para este worker específico no cluster
    const dbName = `suplilist_e2e_worker_${workerIndex}`;
    const uri = process.env.MONGO_URI || `mongodb://127.0.0.1:27017`;
    
    // Conecta se não houver conexão ativa
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(`${uri}/${dbName}`);
    }
    return dbName;
}

export async function clearTestDB() {
    // O método mais seguro e rápido para resetar o estado sem derrubar a conexão
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
}

export async function disconnectTestDB() {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase(); // Remove o banco inútil do worker
        await mongoose.disconnect();
    }
}
