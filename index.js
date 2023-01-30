import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import moment from "moment/moment.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv"
import { auth } from "./middleware/auth.js";
import nodemailer from "nodemailer"
import { resetauth } from "./middleware/resetauth.js";
import stripes from "stripe";
dotenv.config()


const stripe = stripes(process.env.STRIPE_KEY);
const calculateOrderAmount = (items) => {

    return 1400;
};

const app = express();
// const MONGO_URL = "mongodb://127.0.0.1";
const client = new MongoClient(process.env.MONGO_URL)
await client.connect()

console.log("Mongo is connected")
app.use(express.json())
app.use(cors())
app.use(express.static("public"));
const PORT = process.env.PORT;
app.get("/gettheaters", async function (request, response) {
    const data = await client.db("bookmyshow").collection("theaters").find({}).toArray()


    response.send(data);
});


app.post("/signup", async function (request, response) {
    const { username, password, email } = request.body
    const isCheck = await client.db("bookmyshow").collection("login").findOne({ username: username })
    if (!isCheck) {
        const Hashedpassword = await Hashed(password)
        async function Hashed(password) {
            const NO_OF_ROUNDS = 10
            const salt = await bcrypt.genSalt(NO_OF_ROUNDS)
            const HashedPassword = await bcrypt.hash(password, salt)
            return HashedPassword
        }
        let finalData = {
            username: username,
            password: Hashedpassword,
            role_id: 0,
            email: email
        }
        const insertData = await client.db("bookmyshow").collection("login").insertOne(finalData)
        if (insertData) {
            response.send({ message: "sign success" })
        }
    } else {
        response.send({ message: "sign fail" })
    }




})

app.post("/login", async function (request, response) {
    const data = request.body

    const loginData = await client.db("bookmyshow").collection("login").findOne({ username: data.username })
    if (loginData) {

        async function comparPassword() {
            return bcrypt.compare(data.password, loginData.password);
        }
        const comparePassword = await comparPassword()
        if (comparePassword) {
            const token = jwt.sign({ _id: ObjectId(loginData._id) }, process.env.MY_KEY)
            response.send({ message: "successful login", token: token, role_id: loginData.role_id, email: loginData.email })
        }
    } else {
        response.send({ message: "error" })
    }

})



app.post("/createtheater", auth, async function (request, response) {
    let data = request.body
    let username = data.theatername
    let checkTheater = await client.db("bookmyshow").collection("theaters").findOne({ theatername: username })
    if (checkTheater) {
        response.send({ message: "Theater already created" });
    } else
        if (!checkTheater) {
            let uploadTheater = await client.db("bookmyshow").collection("theaters").insertOne(data)
            response.send({ message: "Theater created Successfully", theatername: username });
        } else {
            response.send({ message: "unsuccessful" })
        }
});


app.put("/createshows/:id", auth, async function (request, response) {

    const { id } = request.params
    let data = request.body;

    const checkTheatername = await client.db("bookmyshow").collection("theaters").findOne({ theatername: id })
    let num = Number(data.seats)
    if (checkTheatername) {
        let showsData = checkTheatername.shows
        let arr = []
        for (let i = 65; i < 75; i++) {
            let s = String.fromCharCode(i)
            for (let j = 1; j <= (num / 10); j++) {
                arr.push({
                    seat_no: s + j,
                    booked: false,
                    occupied: false,
                    username: "",
                    _id: new ObjectId(),
                    rate: 200
                })

            }
        }
        data._id = new ObjectId()
        data.allseats = arr
        // let updateTheaterName = checkTheatername.theatername

        // const compareData = db.theaters.find({}, { "shows.movieEndDateandTime": 1 }).sort({ ISODate("shows.movieEndDateandTime"): -1 })

        const insertedData = await client.db("bookmyshow").collection("theaters").updateOne({ theatername: checkTheatername.theatername }, { $push: { shows: data } })
        const theaterfinal = await client.db("bookmyshow").collection("theaters").findOne({ theatername: checkTheatername.theatername })

        if (insertedData) {
            response.send({ message: `Show created successfully`, theaterfinal })
        } else {
            response.send({ message: "error" })
        }
    }









})


app.get("/shows/:id", auth, async function (request, response) {
    let { id } = request.params

    let checkTheater = await client.db("bookmyshow").collection("theaters").findOne({ theatername: id }, {
        projection: {
            _id: 0,
            shows: 1
        }
    })
    if (checkTheater) {
        response.send(checkTheater)

    } else {
        response.send({ message: "error" })
    }
})


app.get("/bookseat/:id", auth, async function (request, response) {
    let { id } = request.params
    let input = id.split("-")
    let name = input[0]
    let checkTheater = await client.db("bookmyshow").collection("theaters").findOne({ theatername: name }, {
        projection: {
            _id: 0,
            shows: 1
        }
    })
    if (checkTheater) {
        response.send(checkTheater)

    } else {
        response.send({ message: "error" })
    }
})

app.get("/compareshows/:id", async function (request, response) {
    let { id } = request.params
    let checkTheater = await client.db("bookmyshow").collection("theaters").findOne({ theatername: id })
    response.send({ result: checkTheater })

})


app.put('/delshows/:id', async function (request
    , response) {
    let { id } = request.params
    let input = id.split("-")
    let name = input[0]
    let num = input[1]
    let theaterShow = await client.db("bookmyshow").collection("theaters").updateOne({ theatername: name }, {
        $pull: { shows: { _id: ObjectId(num) } }
    })
    if (theaterShow) { response.send({ message: "deleted" }) } else {
        response.send({ message: "error" })
    }
})



app.delete('/deltheater/:id', async function (request
    , response) {
    let { id } = request.params
    let theaterShow = await client.db("bookmyshow").collection("theaters").deleteOne({ theatername: id })
    if (theaterShow) { response.send({ message: "deleted" }) } else {
        response.send({ message: "error" })
    }
})

app.put("/userseatbooking/:id/:username/:movie_id", async function (request, response) {
    let data = request.body
    let count = 0
    const { id, username, movie_id } = request.params
    for (let i = 0; i < data.length; i++) {
        const updateData = await client.db("bookmyshow").collection("theaters").updateOne({ theatername: id },
            {

                $set: {
                    "shows.$[m].allseats.$[i].username": username,
                    "shows.$[m].allseats.$[i].booked": true,
                }
            }, { arrayFilters: [{ "m._id": ObjectId(movie_id) }, { "i._id": ObjectId(data[i]) }] }
        )
        if (updateData) {
            count++
        }
    }
    if (count == data.length) {
        response.send({ message: "updated" })
    } else {
        response.send({ message: "error" })
        count = 0
    }

})


app.post("/forgetpassword", async function (request, response) {
    const { username, email } = request.body;
    const data = await client.db("bookmyshow").collection("login").findOne({ username: username })
    if (data.username == username && data.email == email) {
        let tempLink = ""
        const character = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789"
        const characters = character.length
        for (let i = 0; i < 40; i++) {
            tempLink += character.charAt(Math.floor(Math.random() * characters))

        }
        const otp = Math.floor(1000 + Math.random() * 9000)
        const otpData = {
            otp: otp,
            email: email,
            username: username,
            tempLink: `https://ticket-book-my-show.netlify.app/verification-link/${username}/${tempLink}`,
        }

        const checkData = await client.db("bookmyshow").collection("otp").findOne({ username: username })
        if (!checkData) {
            const otpInsertData = client.db("bookmyshow").collection("otp").insertOne(otpData)

            const finalData = await client.db("bookmyshow").collection("otp").findOne({ username: username })


            setTimeout(async () => {
                await client.db("bookmyshow").collection("otp").deleteOne({ otp: otp })
            }, 120000);


            async function main(finalData) {

                // Generate test SMTP service account from ethereal.email
                // Only needed if you don't have a real mail account for testing
                let username = finalData.username;
                let otp = finalData.otp;
                let email = finalData.email;
                let tempLink = finalData.tempLink
                let testAccount = await nodemailer.createTestAccount();
                // create reusable transporter object using the default SMTP transport
                const my = async () => {

                    let transporter = await nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 25,
                        secure: false,
                        auth: {
                            user: "mohammedansari808@gmail.com",
                            pass: "gjehcxvsnxpvpxro",
                        },
                    });

                    // send mail with defined transport object

                    let info = await transporter.sendMail({
                        from: '"bookmyshow" <foo@example.com>', // sender address
                        to: `${email}`, // list of receivers
                        subject: "Verification link", // Subject line
                        text: "Hello world?", // plain text body
                        html: `Hi ${username} your otp is <strong>${otp} </strong>it will expire in two minutes
                    please paste it in the following link ${tempLink}`, // html body
                    });


                    console.log("Message sent: %s", info.messageId);
                    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

                    // Preview only available when sending through an Ethereal account
                    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
                    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
                }
                await my()

            }

            main(otpData).catch(console.error);
            response.send({ message: "link sent" });
            ;

        }




    } else {
        response.send("error")
    }

    // async..await is not allowed in global scope, must use a wrapper

});


app.post("/verification-link/:username/:id", async function (request, response) {
    const { username, id } = request.params

    let data = request.body
    const otpData = await client.db("bookmyshow").collection("otp").findOne({ username: username })

    if (parseInt(data.otp) == parseInt(otpData.otp)) {
        const token = jwt.sign({ _id: ObjectId(data._id) }, process.env.RESET_KEY)
        response.send({ message: "otp success", username: username, token: token })
    } else {
        response.send({ message: "error" })
    }

})

app.put("/password-change/:username", resetauth, async function (request, response) {
    let data = request.body
    const { username } = request.params



    const Hashedpassword = await Hashed(data.newpassword)
    async function Hashed(password) {
        const NO_OF_ROUNDS = 10
        const salt = await bcrypt.genSalt(NO_OF_ROUNDS)
        const HashedPassword = await bcrypt.hash(password, salt)
        return HashedPassword
    }
    let checkuser = await client.db("bookmyshow").collection("login").updateOne({ username: username }, { $set: { password: Hashedpassword } })
    if (checkuser) {
        response.send({ message: "success" })
    } else if (response.status === 404) {
        response.send({ message: "error" })
    }





})




//////////payment//////

app.post("/pay", auth, async function (request, response) {

    const data = request.body;
    // Create a PaymentIntent with the order amount and currency

    const customer = await stripe.customers.create();
    customer.email = data.email



    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(parseInt(data.prize)),
        currency: "inr",
        customer: customer.id,
        setup_future_usage: "off_session",
        automatic_payment_methods: {
            enabled: true,
        }
        , receipt_email: data.email
    });


    const paymentdetails = await client.db("bookmyshow").collection("paymentdetails").insertOne(customer)
    response.send({
        "clientSecret": paymentIntent.client_secret,

    });

})
app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));