window.DD = window.DD || {};
DD.assets = {
  images: {},
  load() {
    const names = ['slime_sheet','bat','goblin','player','dwarf','chest','warning_sign','cave_autotile_32','cave_wall_32','goblin_break_meter','exit_ladder_v2'];
    let loaded = 0;
    const total = names.length;
    return new Promise((resolve) => {
      names.forEach(name => {
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded += 1;
          if (loaded >= total) resolve();
        };
        img.src = `./assets/${name}.${(name.startsWith('cave_') || name === 'slime_sheet' || name === 'goblin_break_meter' || name === 'exit_ladder_v2' || name === 'warning_sign') ? 'png' : 'svg'}`;
        this.images[name] = img;
      });
    });
  },
  get(name) { return this.images[name]; }
};
