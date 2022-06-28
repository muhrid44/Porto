require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const {
  Schema
} = mongoose;
var SibApiV3Sdk = require('sib-api-v3-sdk');
var defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key authorization: api-key
var apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.API_KEY;

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.KEY,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://" + process.env.MONGO + "cluster0.zhccn.mongodb.net/EventDB")
// mongoose.connect("mongodb://localhost:27017/EventDB") //LOCAL DB


// ADMIN SCHEMA

const adminSchema = new mongoose.Schema({
  name: String,
  password: String
});

adminSchema.plugin(passportLocalMongoose);

const Admin = mongoose.model("Admin", adminSchema);

passport.use(Admin.createStrategy());

passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());


// ADMIN REGISTER

// Admin.register({
//   username: process.env.USERNAME_ADMIN
// }, process.env.PASSWORD_ADMIN, function(err, admin) {
//   if (err) {
//     console.log(err);
//   } else {
//     passport.authenticate("local")(function() {
//       console.log("data_saved");
//     })
//   }
// })

// PARTICIPANT

const participantSchema = new Schema({
  name: String,
  email: String,
  phone: Number,
  address: String,
  vehicle: String
});

const Participant = mongoose.model("Participant", participantSchema);

// EVENT schema

const eventSchema = new Schema({
  event_name: String,
  description: String,
  date: String,
  time: String,
  max_participant: Number,
  location: String,
  gmapsURL: String,
  landmark: String,
  edited: String,
  participant: []
});

const Event = mongoose.model("Event", eventSchema);

// FOR USER

app.get("/", function(req, res) {

  Event.find({}, function(err, latest) {

    // SORTING ARRAY BY DATE

    const arr = latest.sort(function(x, y) {
      return new Date(x.date) - new Date(y.date)
    })
    // console.log(arr);

    // FOOR LOP SEARCHING PARTICIPANT CAPACITY
    function notYetFull() {
      for (let i = 0; i <= arr.length - 1; i++) {
        if (arr[i].participant.length < arr[i].max_participant) {
          return arr[i]
        }
      }
      return "null"
    }

    // IF STATEMENT FOR OUTPUT
    // console.log(notYetFull());

    if (notYetFull() != "null") {

      const firstArr = notYetFull();

      res.render("home_user", {
        mainEvent: firstArr
      })
    } else {
      const firstArr = {
        event_name: "",
        description: "we don't have any event yet :(",
        date: "",
        time: "",
        max_participant: "",
        location: "",
        gmapsURL: "",
        landmark: "",
        edited: "",
        participant: []
      }
      res.render("home_user", {
        mainEvent: firstArr
      })
    }
  })
});

app.get("/event_user", function(req, res) {

  Event.deleteMany({
    date: {
      $lt: new Date().toLocaleDateString("en-US")
    }
  }, function(err) {
    if (err) {
      console.log(err);
    }
  });

  Event.find({}, function(err, eventFound) {
    if (err) {
      console.log(err);
    } else {
      // console.log(eventFound);
      res.render("event_user", {
        eventArray: eventFound,
      });
    };
  });

});

app.get("/input_form", function(req, res) {
  res.render("input_form")
})

app.get("/login_admin", function(req, res) {
  res.render("login_admin")
})

app.get("/events/:id", function(req, res) {

  const eventID = req.params.id;

  Event.findOne({
    _id: eventID
  }, function(err, result) {
    if (err) {
      console.log(err);
    } else {
      const event_name = result.event_name;
      const description = result.description;
      const date = result.date;
      const time = result.time;
      const max_participant = result.max_participant;
      const location = result.location;
      const gmaps = result.gmapsURL;
      const landmark = result.landmark;
      const edited = result.edited;
      const participant = result.participant;

      res.render("event_detail_user", {
        id: result._id,
        event_name: event_name,
        description: description,
        date: date,
        time: time,
        max_participant: max_participant,
        location: location,
        gmaps: gmaps,
        landmark: landmark,
        edited: edited,
        participant: participant
      });
    };
  });
});

app.get("/join/:id", function(req, res) {

  const idEvent = req.params.id;

  res.render("input_form", {
    id: idEvent
  })
});

app.post("/input", function(req, res) {

  // console.log(req.body.id);

  const participant = new Participant({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    vehicle: req.body.vehicle
  });

  participant.save(function(err) {
    if (!err) {
      Event.findOne({
        _id: req.body.id
      }, function(err, eventsFound) {
        if (err) {
          console.log(err);
        } else {
          eventsFound.participant.push(
            participant._id
          );
          eventsFound.save(function(err) {
            if (!err) {

              new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
                subject: 'Hello There',
                sender: {
                  'email': 'pedulisekitar1@gmail.com',
                  'name': 'Peduli Sekitar'
                },
                to: [{
                  'name': req.body.name,
                  'email': req.body.email
                }],
                templateId: 1
              }).then(function(data) {
                console.log(data);
              }, function(error) {
                console.error(error);
              });

              res.render("success_registration")
            }
          });
        }
      });
    }
  })
});


// FOR ADMIN

app.get("/event_manage", function(req, res) {
  if (req.isAuthenticated()) {

    Event.deleteMany({
      date: {
        $lt: new Date().toLocaleDateString("en-US")
      }
    }, function(err) {
      if (err) {
        console.log(err);
      }
    });

    Event.find({}, function(err, eventFound) {
      if (err) {
        console.log(err);
      } else {
        res.render("event_manage", {
          eventArray: eventFound,
        });
      };
    });
  } else {
    res.render("login_admin")
  }
});

app.get("/event_detail_manage", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("event_detail_manage")
  } else {
    res.render("login_admin")
  }
});

app.get("/create_event", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("create_event")
  } else {
    res.render("login_admin")
  }
});

app.get("/edit_event", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("edit_event")
  } else {
    res.render("login_admin")
  }
});

app.get("/logout", function(req, res) {
  req.logout(function() {
    res.redirect("/");

  });
});

app.post("/login", function(req, res) {

  const admin = new Admin({
    username: req.body.username,
    password: req.body.password
  });

  req.login(admin, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/event_manage")
      })
    }
  })

});

app.post("/create", function(req, res) {

  const eventName = req.body.name;
  const eventDescription = req.body.description;
  const eventDate = new Date(req.body.date).toLocaleDateString("en-US");
  const eventTime = req.body.time;
  const eventParticipant = req.body.numberParticipant;
  const eventLocation = req.body.meetingPoint;
  const eventGmaps = req.body.gmaps;
  const eventLandmark = req.body.landmark;

  const dateCreated = new Date().toLocaleDateString("en-US")


  const events = new Event({
    event_name: eventName,
    description: eventDescription,
    date: eventDate,
    time: eventTime,
    max_participant: eventParticipant,
    location: eventLocation,
    gmapsURL: eventGmaps,
    landmark: eventLandmark,
    edited: dateCreated,
    participant: []
  });

  events.save();
  // console.log("submitted");
  res.redirect("event_manage")
});



app.post("/delete", function(req, res) {


  const deletedEvent = req.body.delete;

  Event.findByIdAndRemove({
    _id: deletedEvent
  }, function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/event_manage");
    }
  });

});

app.get("/edit/:id", function(req, res) {

  const editedEvent = req.params.id;

  Event.findOne({
    _id: editedEvent
  }, function(err, result) {
    if (err) {
      console.log(err);
    } else {
      const event_name = result.event_name;
      const description = result.description;
      const date = new Date(result.date);
      const time = result.time;
      const max_participant = result.max_participant;
      const location = result.location;
      const gmaps = result.gmapsURL;
      const landmark = result.landmark;
      const id = result._id;

      res.render("edit_event", {
        event_name: event_name,
        description: description,
        date: date,
        time: time,
        max_participant: max_participant,
        location: location,
        gmaps: gmaps,
        landmark: landmark,
        id: id
      });

    }
  })
});

app.post("/edit", function(req, res) {

  Event.findOneAndUpdate({
    _id: req.body.id
  }, {
    event_name: req.body.name,
    description: req.body.description,
    date: new Date(req.body.date).toLocaleDateString("en-US"),
    time: req.body.time,
    max_participant: req.body.numberParticipant,
    location: req.body.meetingPoint,
    gmapsURL: req.body.gamaps,
    landmark: req.body.landmark,
    edited: new Date().toLocaleDateString("en-US"),
  }, function(err) {
    if (!err) {
      res.redirect("/event_manage")
    }
  });
});

app.get("/admin_event/:id", function(req, res) {

  const idEvent = req.params.id;

  Event.findOne({
    _id: idEvent
  }, function(err, eventFound) {
    if (err) {
      console.log(err);
    } else {

      Participant.find({
        _id: eventFound.participant
      }, function(err, listFound) {
        if (!err) {

          let number = 1;
          res.render("event_detail_manage", {
            id: eventFound._id,
            event_name: eventFound.event_name,
            description: eventFound.description,
            date: eventFound.date,
            time: eventFound.time,
            max_participant: eventFound.max_participant,
            location: eventFound.location,
            gmaps: eventFound.gmapsURL,
            landmark: eventFound.landmark,
            edited: new Date().toLocaleDateString("en-US"),
            list: listFound,
            number: number
          });
        }
      });


    };
  });

});



app.listen(process.env.PORT || 3000, function() {
  console.log("Welcome to port 3000!");
})
