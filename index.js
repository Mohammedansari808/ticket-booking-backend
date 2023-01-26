import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import moment from "moment/moment.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv"
import { auth } from "./middleware/auth.js";
dotenv.config()
const app = express();
const MONGO_URL = "mongodb://127.0.0.1";
const client = new MongoClient(MONGO_URL)
await client.connect()

console.log("Mongo is connected")
app.use(express.json())
app.use(cors())
const PORT = 4000;
app.get("/", function (request, response) {
    response.send("🙋‍♂️, 🌏 🎊✨🤩");
});
/////////////////////
app.post("/signup", async function (request, response) {
    const { username, password } = request.body
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
            role_id: 0
        }
        const insertData = await client.db("bookmyshow").collection("login").insertOne(finalData)
        if (insertData) {
            response.send({ message: "sign success" })
        }
    } else {
        response.send({ message: "sign fail" })
    }




})

/////////////////////////////

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
            response.send({ message: "successful login", token: token, role_id: loginData.role_id })
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
    // console.log(new Date(data.dd).toLocaleString(undefined, { timeZone: 'Asia/Kolkata' }))
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
                    _id: new ObjectId()
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


app.delete('/delshows/:id', async function (request
    , response) {
    let { id } = request.params
    let input = id.split("-")
    let name = input[0]

    let theaterShow = await client.db("bookmyshow").collection("theaters").deleteOne({ "shows.moviename": name })
    if (theaterShow) { response.send({ message: "deleted" }) } else {
        response.send({ message: "error" })
    }
})


app.put("/deleteuser/:id", auth, async function (request, response) {

    let theaterShow = await client.db("bookmyshow").collection("theaters").updateOne({ theatername: "rohini" }, {
        $set: {
            "shows.$[m].allseats.$[s].username": "helo"
        }
    }, { arrayFilters: [{ "m._id": ObjectId("63d174b897565bab467e2bbd") }, { "s._id": ObjectId("63d174b897565bab467e2b59") }] })
    theaterShow ? console.log("hello") : null
})

app.put("/userseatbooking/:id/:username/:movie_id", async function (request, response) {
    let data = request.body
    let count = 0
    const { id, username, movie_id } = request.params
    console.log(username)
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


// let theaterShow = await client.db("bookmyshow").collection("theaters").updateOne({ theatername: "rohini" }, {
//     $set: {
//         "shows.$[m].allseats.$[s].username": "helo"
//     }
// }, { arrayFilters: [{ "m._id": ObjectId("63d174b897565bab467e2bbd") }, { "s._id": ObjectId("63d174b897565bab467e2b59") }] })
// theaterShow ? console.log("hello") : null



app.get("/", function (request, response) {
    response.send("🙋‍♂️, 🌏 🎊✨🤩");
});

app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));