(function () {
  var audio    = document.getElementById('orhAudio');
  var player   = document.getElementById('orh-player');
  var wv       = document.getElementById('orhWv');
  var bpIcon   = document.getElementById('orhBpIcon');
  var pageIcon = document.getElementById('orhPageIcon');
  var pageLbl  = document.getElementById('orhPageLbl');
  var dot      = document.getElementById('orhDot');
  var subTxt   = document.getElementById('orhSubTxt');
  var playing  = false;

  var PLAY  = '<polygon points="6 3 20 12 6 21 6 3"/>';
  var PAUSE = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

  audio.volume = 0.8;

  function _setLive() {
    dot.classList.remove('orh-offline');
    subTxt.textContent = 'Live';
  }
  function _setOffline() {
    dot.classList.add('orh-offline');
    subTxt.textContent = 'Offline';
  }

  // Parse "or"-separated URLs from the <source> src attribute
  var sourceEl = audio.querySelector('source');
  var urls = sourceEl.getAttribute('src').split(/\s+or\s+/).map(function(u){ return u.trim(); });
  var urlIndex = 0;

  function _loadUrl(index) {
    audio.src = urls[index];
    audio.load();
  }

  // On error, try next URL in the list
  audio.addEventListener('error', function () {
    if (urlIndex < urls.length - 1) {
      urlIndex++;
      _loadUrl(urlIndex);
      if (playing) audio.play().catch(function(){});
    } else {
      _setOffline();
    }
  });

  // Audio is actively playing → Live
  audio.addEventListener('playing', _setLive);

  // Stream stalled or ended → Offline
  audio.addEventListener('stalled', _setOffline);
  audio.addEventListener('ended',   _setOffline);

  // Paused by user → Offline
  audio.addEventListener('pause',   _setOffline);

  window.orhTogglePlay = function () {
    playing ? _pause() : _play();
  };

  window.orhSetVol = function (v) {
    audio.volume = v / 100;
  };

  function _play() {
    if (urlIndex === 0 && !audio.src) _loadUrl(0);
    audio.play().catch(function (e) { console.warn('Audio blocked:', e); });
    playing = true;
    player.classList.add('orh-open');
    document.body.classList.add('orh-body-pad');
    wv.classList.add('orh-playing');
    bpIcon.innerHTML    = PAUSE;
    pageIcon.innerHTML  = PAUSE;
    pageLbl.textContent = 'Pause';
  }

  function _pause() {
    audio.pause();
    playing = false;
    wv.classList.remove('orh-playing');
    bpIcon.innerHTML    = PLAY;
    pageIcon.innerHTML  = PLAY;
    pageLbl.textContent = 'Play';
  }
})();