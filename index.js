const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

let bodyParser = require("body-parser");

let mongoose = require("mongoose");

let mySecret = process.env["MONGO_URI"];

mongoose.connect(mySecret, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
});

let userModel = mongoose.model("user", userSchema);

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: new Date() },
});

let exerciseModel = mongoose.model("exercise", exerciseSchema);

app.use(cors());
app.use(express.static("public"));

app.use("/", bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});


app.post("/api/users", (req, res) => {
  let username = req.body.username;
  let newUser = new userModel({ username: username });

  newUser.save()
    .then((savedUser) => {
      res.json(savedUser);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
});

app.get("/api/users", (req, res) => {
  userModel.find({}).then((users) => {
    res.json(users);
  });
});




app.post("/api/users/:_id/exercises", (req, res) => {
  let userId = req.params._id;

  exerciseObj = {
    userId: userId,
    description: req.body.description,
    duration: req.body.duration,
  };

  if (req.body.date !== "") {
    exerciseObj.date = req.body.date;
  }

  let newExercise = new exerciseModel(exerciseObj);

  userModel.findById(userId).exec()
    .then((userFound) => {
      if (!userFound) {
        return res.status(404).send('User not found');
      }

      newExercise.save()
        .then(() => {
          res.json({
            _id: userFound._id,
            username: userFound.username,
            description: newExercise.description,
            duration: newExercise.duration,
            date: new Date(newExercise.date).toDateString(),
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(500).send('Internal Server Error');
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
});


app.get("/api/users/:_id/logs", (req, res) => {
  let fromParam = req.query.from;
  let toParam = req.query.to;
  let limitParam = req.query.limit;
  let userId = req.params._id;

  limitParam = limitParam ? parseInt(limitParam) : limitParam;

  userModel.findById(userId).exec()
    .then((userFound) => {
      if (!userFound) {
        return res.status(404).send('User not found');
      }

      let queryObj = {
        userId: userId,
      };

      if (fromParam || toParam) {
        queryObj.date = {};

        if (fromParam) {
          queryObj.date["$gte"] = fromParam;
        }

        if (toParam) {
          queryObj.date["$lte"] = toParam;
        }
      }

      exerciseModel.find(queryObj).limit(limitParam).exec()
        .then((exercises) => {
          let resObj = {
            _id: userFound._id,
            username: userFound.username,
            log: exercises.map((x) => ({
              description: x.description,
              duration: x.duration,
              date: new Date(x.date).toDateString(),
            })),
            count: exercises.length,
          };

          res.json(resObj);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).send('Internal Server Error');
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
