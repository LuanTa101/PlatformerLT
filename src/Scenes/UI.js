class UI extends Phaser.Scene {
    constructor() {
        super({ key: 'uiScene', active: true });
    }
    preload() {
        this.load.setPath("./assets/Art/");
        this.load.image("emptyHeart", "hudHeart_empty.png");
        this.load.image("fullHeart", "hudHeart_full.png");
    }

    create() {
        // Access the Platformer scene
        this.platformerScene = this.scene.get('platformerScene');
        // Create the text object
        this.starText = this.add.text(this.cameras.main.width - 20, this.cameras.main.height - 20, '', {
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(1);
        // Update the star count text every frame
        this.events.on('update', this.updateStarText, this);
        // Create hearts array
        this.hearts = [];
        // Display hearts on the bottom left
        for (let i = 0; i < 3; i++) {
            let heart = this.add.image(-10 + i * 60, this.cameras.main.height + 10, 'fullHeart').setOrigin(0, 1);
            this.hearts.push(heart);
        }
        // Listen for event to disable UI
        this.events.on('disableUI', this.disableUI, this);
    }

    updateStarText() {
        // Access the starGroup length from the Platformer scene and update the text
        if (this.platformerScene.starGroup) {
            this.starText.setText(`Stars: ${this.platformerScene.starSize}`);
        }
    }

    updateHearts(health) {
        for (let i = 0; i < this.hearts.length; i++) {
            if (i < health) {
                this.hearts[i].setTexture('fullHeart');
            } else {
                this.hearts[i].setTexture('emptyHeart');
            }
        }
    }

    disableUI() {
        this.events.off('update', this.updateStarText, this);
        // Hide the star count text
        this.starText.visible = false;
        // Hide the hearts
        this.hearts.forEach(heart => {
            heart.visible = false;
        });
    }
}