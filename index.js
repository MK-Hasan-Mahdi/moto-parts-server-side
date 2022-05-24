const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4lnss.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        // console.log('database connected');
        const productCollection = client.db('motoParts').collection('product');
        const orderCollection = client.db('motoParts').collection('order');
        // const productCollection = client.db('motoParts').collection('product');
        // const productCollection = client.db('motoParts').collection('product');

        //    get all product
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        // get single  product
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });


        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const updateProduct = req.body;
            console.log(updateProduct);
            const query = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    availableQty: updateProduct.availableQty
                }
            }

            const result = await productCollection.updateOne(query, updateDoc, options)
            res.send(result)
        });

        // load all orders
        app.get('/order', async (req, res) => {
            // const query = {};
            const email = req.query.email;
            const query = { email: email };
            // const cursor = orderCollection.find(query);
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        // for post orders
        app.post("/order", async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })


    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Alhamdulillah');
})

app.listen(port, () => {
    console.log(`Alhamdulillah, Moto-Parts listening on port ${port}`)
})