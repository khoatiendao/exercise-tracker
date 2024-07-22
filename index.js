const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

try {
  mongoose
    .connect(process.env.DB_URL + process.env.DB_NAME, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log('Connected Mongoose Success'));
} catch (error) {
  console.log(error);
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const exerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
    required: true,
  },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });
  const saveUser = await newUser.save(newUser);
  res.json({ username: saveUser.username, _id: saveUser._id });
});

app.get('/api/users', async (req, res) => {
  const result = await User.find({});
  res.json(result);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const _id = req.params._id;
  const { description, duration, date } = req.body;

  const findUserId = await User.findById(_id);
  if (!findUserId) return res.status(500).send('Server error');

  const newExercise = new Exercise({
    userId: _id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date()
  });

  await newExercise.save();

  const updatedUser = await User.findById(_id); // Tìm lại người dùng để trả về thông tin cập nhật
  if (!updatedUser) return res.status(404).send('User not found');
  res.json({
    _id: updatedUser._id,
    username: updatedUser.username,
    date: newExercise.date.toDateString(),
    duration: newExercise.duration,
    description: newExercise.description,
  });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const _id = req.params._id;
  const { from, to, limit } = req.query;

  const user = await User.findById(_id);
  if (!user) return res.status(404).send('User not found');

  const query = { userId: _id };

  // Nếu có tham số from, thêm điều kiện từ ngày đó trở đi
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate)) {
      query.date = { ...query.date, $gte: fromDate };
    } else {
      return res.status(400).send('Invalid from date');
    }
  }

  // Nếu có tham số to, thêm điều kiện đến ngày đó
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate)) {
      query.date = { ...query.date, $lte: toDate };
    } else {
      return res.status(400).send('Invalid to date');
    }
  }

  let exerciseQuery = Exercise.find(query);
  if (limit) {
    exerciseQuery = exerciseQuery.limit(parseInt(limit));
  }

  const exercises = await exerciseQuery.exec();
  res.json({
    _id: user._id,
    username: user.username,
    from: from ? new Date(from).toDateString() : undefined,
    to: to ? new Date(to).toDateString() : undefined,
    count: exercises.length,
    log: exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    })),
  });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
