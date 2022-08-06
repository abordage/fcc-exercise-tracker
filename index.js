require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

app.use(cors({ optionsSuccessStatus: 200 }))
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
})
const User = mongoose.model('User', userSchema)

const exerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: false,
  },
})
const Exercise = mongoose.model('Exercise', exerciseSchema)

const createUser = (username) => {
  const newUser = new User({ username: username })

  return newUser.save()
    .then((doc) => {
      return { username: doc.username, _id: doc._id }
    })
    .catch((err) => { return { error: err }})
}

const getAllUsers = () => {
  return User
    .find({})
    .then((docs) => {
      return docs.map((doc) => {
        return { username: doc.username, _id: doc._id }
      })
    })
    .catch((err) => { return { error: err } })
}

const createExercise = (data) => {
  return User
    .findById(data._id)
    .then((user) => {
      const exercise = new Exercise({
        userId: user._id,
        username: user.username,
        description: data.description,
        duration: data.duration,
        date: data.date,
      })
      return exercise.save()
    })
    .then((doc) => {
      return {
        _id: doc.userId,
        username: doc.username,
        description: doc.description,
        duration: doc.duration,
        date: doc.date.toDateString(),
      }
    })
    .catch((err) => { return { error: err } })
}

const getLog = (userId, params) => {

  const query = { userId: userId }

  if (params.from) {
    query['$gte'] = new Date(params.from)
  }

  if (params.to) {
    query['$lte'] = new Date(params.to)
  }

  let limit = parseInt(params.limit)

  let username
  let count
  let log

  return Exercise
    .find(query)
    .limit(limit)
    .then((docs) => {
      count = docs.length

      log = docs.map((doc) => {
        return { description: doc.description, duration: doc.duration, date: doc.date.toDateString() }
      })
    })
    .then(() => {
      return User.findById(userId)
        .then((doc) => {
          username = doc.username
        })
        .catch((err) => { throw new Error(err) })
    })
    .then(() => { return { username: username, _id: userId, count: count, log: log } })
    .catch((err) => { return { error: err } })
}

app.post('/api/users', (req, res) => {
  const username = req.body.username
  createUser(username)
    .then((doc) => { return res.json(doc) })
    .catch((err) => { console.log(err) })
})

app.get('/api/users', (req, res) => {
  getAllUsers()
    .then((docs) => { return res.json(docs) })
    .catch((err) => { console.log(err) })
})

app.post('/api/users/:_id/exercises', (req, res) => {
  const _id = req.params._id
  const { description, duration, date } = req.body

  const formattedDate = !date ? new Date() : new Date(date)
  const exerciseData = { _id, description, duration, date: formattedDate }

  createExercise(exerciseData)
    .then((doc) => { return res.json(doc) })
    .catch((err) => { console.log(err) })
})

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id
  let { from, to, limit } = req.query

  getLog(userId, { from, to, limit })
    .then((doc) => { return res.json(doc) })
    .catch((err) => { console.log(err) })
})

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})