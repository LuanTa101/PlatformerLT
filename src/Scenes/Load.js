musicPlaying = true;
class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/Art/");
        // Load characters spritesheet
        this.load.atlasXML("platformer_characters", "players.png", "players.xml");
        // Load tilemap information
        this.load.image("tilemap_tiles_image", "tilesheet_complete.png");                         // Packed tilemap
        this.load.tilemapTiledJSON("platformer-level-1-map", "platformer-level-1-map.json");   // Tilemap in JSON
        // Load the tilemap as a spritesheet
        this.load.spritesheet("tilemap_sheet", "tilesheet_complete.png", {
            frameWidth:64,
            frameHeight: 64
        });
        this.load.multiatlas("kenny-particles", "kenny-particles.json");

        // Sounds
        this.load.setPath("./assets/Sound/");
        this.load.audio("buttonClick", "buttonClick.wav");
        this.load.audio("climbSound", "climb.wav");
        this.load.audio("collectCoin", "collectCoin.wav");
        this.load.audio("damageSound", "damage.wav");
        this.load.audio("jumpSound", "jump.wav");
        this.load.audio("loseSound", "lose.wav");
        this.load.audio("rotateStone", "rotateStone.wav");
        this.load.audio("signSound", "sign.wav");
        this.load.audio("walkSound", "walk.wav");
        this.load.audio("winSound", "win.wav");
        this.load.audio("bgMusic", "Piki-A_New_Day.mp3");
    }

    create() {

        this.anims.create({
            key: 'walk',
            defaultTextureKey: "platformer_characters",
            frames: [ 
                { frame: "playerBlue_walk1.png" },
                { frame: "playerBlue_walk2.png" },
                { frame: "playerBlue_walk3.png" },
                { frame: "playerBlue_walk4.png" },
                { frame: "playerBlue_walk3.png" },
                { frame: "playerBlue_walk2.png" },
            ],
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: 'idle',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "playerBlue_stand.png" }
            ],
        });

        this.anims.create({
            key: 'jump',
            defaultTextureKey: "platformer_characters",
            frames: [
                {frame: "playerBlue_swim2.png"}
            ],
            repeat: -1
        });

        this.anims.create({
            key: "climb",
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "playerBlue_up1.png"},
                { frame: "playerBlue_up2.png"},
            ],
            repeat: -1
        });
        this.scene.start("platformerScene");
    }
}