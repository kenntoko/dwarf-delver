window.DD = window.DD || {};
DD.assets = {
  images: {},
  load() {
    const names = ['dwarf_soul_idle','dwarf_soul_attack','treasure_chest_sheet','treasure_chest_closed','hero_breath_sheet','hero_yawn_sheet','hero_hurt_sheet','slime_sheet','bat','goblin','player','dwarf','chest','warning_sign','cave_autotile_32','cave_wall_32','goblin_break_meter','exit_ladder_v2'];
    let loaded = 0;
    const total = names.length;
    return new Promise((resolve) => {
      names.forEach(name => {
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded += 1;
          if (loaded >= total) resolve();
        };
        img.src = `./assets/${name.startsWith('hero_') ? name + '_v2' : name}.${(name.startsWith('dwarf_soul_') || name.startsWith('treasure_chest_') || name.startsWith('hero_') || name.startsWith('cave_') || name === 'slime_sheet' || name === 'goblin_break_meter' || name === 'exit_ladder_v2' || name === 'warning_sign') ? 'png' : 'svg'}`;
        this.images[name] = img;
      });
    });
  },
  get(name) { return this.images[name]; }
};
