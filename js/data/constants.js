export const MAX_HP = 10;
export const WIN_VP = 20;
export const STARTING_HP = 10;
export const STARTING_VP = 0;
export const STARTING_ENERGY = 0;
export const NUM_DICE = 6;
export const MAX_REROLLS = 2;
export const TOKYO_ENTER_VP = 1;
export const TOKYO_START_TURN_VP = 2;
export const CARD_STORE_SIZE = 3;
export const SWEEP_COST = 2;
export const TOKYO_BAY_THRESHOLD = 5; // 5+ players enables Tokyo Bay

export const DICE_FACES = ['1', '2', '3', 'claw', 'heart', 'lightning'];

export const PHASES = {
  SETUP: 'setup',
  START_TURN: 'startTurn',
  ROLLING: 'rolling',
  RESOLVING_DICE: 'resolvingDice',
  ENTERING_TOKYO: 'enteringTokyo',
  BUYING: 'buying',
  END_TURN: 'endTurn',
  GAME_OVER: 'gameOver'
};

export const RESOLVE_ORDER = ['heal', 'energy', 'vp', 'attack'];
