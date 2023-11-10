const songs = JSON.stringify(userSongs.playlist[0].songs);

let currentSongIndex = 0;
function songCardClick(filename, title, posterUrl) {
  const audio = document.getElementById('audio');
  const currentSongTitle = document.getElementById('currentSongTitle');
  const currentSongPoster = document.getElementById('currentSongPoster');

  audio.setAttribute('src', `/stream/${filename}`);
  currentSongTitle.innerText = title;
  currentSongPoster.setAttribute('src', posterUrl);
  audio.play();
}

