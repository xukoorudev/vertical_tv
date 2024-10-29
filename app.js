const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload'); // Import express-fileupload

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(fileUpload());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/controller.html'));
});

app.get('/video', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/video.html'));
});

app.get('/play1', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/play1.html'));
});
app.get('/play2', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/play2.html'));
});

app.get('/ctrl1', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/ctrl1.html'));
});
app.get('/ctrl2', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/ctrl2.html'));
});

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  let videoFile = req.files.videoFile;
  let uploadPath = path.join(__dirname, 'public/videos/', videoFile.name);

  videoFile.mv(uploadPath, (err) => {
    if (err) return res.status(500).send(err);
    res.send('File uploaded successfully!');
  });
});

app.get('/videos', (req, res) => {
  const videoDir = path.join(__dirname, 'public/videos');
  fs.readdir(videoDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to read videos');
    }
    res.json(files);
  });
});

// DELETE route to delete a video file
app.delete('public/videos/:fileName', (req, res) => {
  const {  fileName } = req.params;
  const filePath = path.join(__dirname, 'public', 'videos',  fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Failed to delete file: ${filePath}`, err);
      return res.status(500).send('Failed to delete video');
    }
    console.log(`File deleted: ${filePath}`);
    res.send('Video deleted successfully');
  });
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('playVideo1', (videoUrl) => {
    io.emit('playVideo1', videoUrl);
  });
  socket.on('playVideo2', (videoUrl) => {
    io.emit('playVideo2', videoUrl);
  });


  socket.on('startLoop1', (playlistArray) => {
    io.emit('startLoop1', playlistArray);
  });
  socket.on('startLoop2', (playlistArray) => {
    io.emit('startLoop2', playlistArray);
  });

  socket.on('loopSingle1', (videoUrl) => {
    io.emit('loopSingle1', videoUrl);
  });
  socket.on('loopSingle2', (videoUrl) => {
    io.emit('loopSingle2', videoUrl);
  });


  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});





// API endpoint to get all uploaded files
app.get('/files', (req, res) => {
  fs.readdir('./public/videos/', (err, files) => {
      if (err) {
          console.error("Error reading files", err);
          res.status(500).json({ error: "Error reading files" });
      } else {
          res.json({ files });
      }
  });
});

// API endpoint to delete a file
app.delete('/delete/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'videos', req.params.filename);
  fs.unlink(filePath, (err) => {
      if (err) {
          console.error("Error deleting file", err);
          res.status(500).json({ error: "Error deleting file" });
      } else {
          res.json({ message: "File deleted successfully" });
      }
  });
});


server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
