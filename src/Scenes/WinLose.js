class WinLose extends Phaser.Scene {
    constructor() {
        super("winLoseScene");
    }
    init(data) {
        this.starSize = data.starSize;
        this.playerHealth = data.playerHealth;
    }

    create() {
        console.log("win/lose started");
        // Add "You win" text and hide it initially
        this.winText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "You win!", {
            fontSize: '64px',
            fill: '#0f0'
        }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

        // Add "You lose" text and hide it initially
        this.loseText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "You lose!", {
            fontSize: '64px',
            fill: '#f00'
        }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
        // Add "Press R to restart" text
        this.restartText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 50, "Press R to restart", {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

        // Show appropriate text based on the game state
        if (this.starSize === 0) {
            this.showWinText();
            musicPlaying = false;
        } else if (this.playerHealth === 0) {
            this.showLoseText();
            musicPlaying = false;
        }
        // Listen for the 'R' key press to restart the Platformer scene
        this.input.keyboard.on('keydown-R', () => {
            this.scene.start('platformerScene');
        });
    }


    showWinText() {
        this.tweens.add({
            targets: this.winText,
            alpha: 1,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                this.time.delayedCall(500, () => {
                    this.tweens.add({
                        targets: this.restartText,
                        alpha: 1,
                        duration: 1000,
                        ease: 'Power2'
                    });
                });
            }
        });
    }

    showLoseText() {
        this.tweens.add({
            targets: this.loseText,
            alpha: 1,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                this.time.delayedCall(500, () => {
                    this.tweens.add({
                        targets: this.restartText,
                        alpha: 1,
                        duration: 1000,
                        ease: 'Power2'
                    });
                });
            }
        });
    }
}
