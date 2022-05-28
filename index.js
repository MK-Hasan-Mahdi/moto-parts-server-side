const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4lnss.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden' })
        }
        req.decoded = decoded;
        next();
    });

}

async function run() {
    try {
        await client.connect();
        // console.log('database connected');
        const productCollection = client.db('motoParts').collection('product');
        const orderCollection = client.db('motoParts').collection('order');
        const userCollection = client.db('motoParts').collection('user');
        const profileCollection = client.db('motoParts').collection('profile');
        const reviewsCollection = client.db('motoParts').collection('reviews');
        const paymentCollection = client.db('motoParts').collection('payments');

        // if need for verify admin
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden' });
            }
        }

        //    get all product
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        // post single product
        app.post('/product', async (req, res) => {
            const newItem = req.body;
            const output = await productCollection.insertOne(newItem);
            res.send(output);
        });

        // get single  product
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        // delete product
        app.delete('/product/:id', async (req, res) => {
            const productId = req.params.id;
            const query = { _id: ObjectId(productId) };
            const output = await productCollection.deleteOne(query);
            res.send(output)
        });

        // single product update 
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const updateProduct = req.body;
            // console.log(updateProduct);
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
        app.get('/order', verifyJWT, async (req, res) => {
            // const query = {};
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access!' });
            }

        });

        // get all users
        app.get("/orders", async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        // order get by id
        app.get("/order/:id", verifyJWT, async (req, res) => {
            const orderId = req.params.id;
            const query = { _id: ObjectId(orderId) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        });


        // for post/insert orders 
        app.post("/order", async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        // delete order by per user/email
        app.delete("/order/:id", async (req, res) => {
            const orderId = req.params.id;
            const query = { _id: ObjectId(orderId) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        // get all users
        app.get("/user", verifyJWT, async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        });

        //API to get user by user email
        app.get('/user/:email', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.params.email;
            // console.log("email", email);
            if (email === decodedEmail) {
                const query = { email: email }
                const cursor = userCollection.find(query)
                const items = await cursor.toArray()
                res.send(items)
            }
            else {
                // console.log(param);
                return res.status(403).send({ message: 'forbidden access' })

            }
        })

        // insert user/user information
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d' })
            res.send({ result, token });
        });

        // check is he admin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        });

        // admin can create/insert another admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email }
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden' });
            }
        });


        // for post/insert profile 
        app.post("/profile", async (req, res) => {
            const order = req.body;
            const result = await profileCollection.insertOne(order);
            res.send(result);
        });

        // // get profile
        app.get("/profile", async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = profileCollection.find(query);
            const profile = await cursor.toArray();
            res.send(profile);
        });

        // get reviews
        app.get("/reviews", async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // review insert
        app.post("/reviews", async (req, res) => {
            const reviews = req.body;
            const result = await reviewsCollection.insertOne(reviews);
            res.send(result);
        });

        // get all users
        app.get("/users", async (req, res) => {
            const query = {};
            const user = await userCollection.find(query).toArray();
            res.send(user);
        });


        // update profile
        app.put("/update/:email", async (req, res) => {
            const email = req.params.email;
            const updatedData = req.body.updatedData;
            const filter = await userCollection.findOne({ email: email });
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    updatedData,
                },
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // payment stripe
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const product = req.body;
            const price = product.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        // create payment collection adn update ordercollection
        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrder);
        });


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