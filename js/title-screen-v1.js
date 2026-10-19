(() => {
  const start = DD.main.start;
  let started = false;
  DD.main.start = function () {
    const app = document.getElementById('app');
    const screen = document.getElementById('titleScreen');
    const button = document.getElementById('startGameButton');
    const begin = () => {
      if (started) return;
      started = true;
      button.disabled = true;
      app.hidden = false;
      screen.remove();
      DD.state.lastTimeStamp = 0;
      start.call(DD.main);
      document.getElementById('menuButton').focus({preventScroll:true});
    };
    button.addEventListener('click', begin, {once:true});
    button.focus({preventScroll:true});
  };
})();
