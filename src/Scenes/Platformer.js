class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
        
    }
    preload() {
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles')
    }
    init() {
        // variables and settings
        this.ACCELERATION = 800;
        this.DRAG = this.ACCELERATION * 3;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 3000;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 0.5;
        this.MAX_X_VEL = 800
        this.MAX_Y_VEL = 2000  
        this.JUMP_VELOCITY = -1500
        this.starSize = 60;
        this.playerHealth = 3;
        this.playerCanMove = true;
        this.canDecrementHealth = true;
        this.isWalking = false;
        this.buttonPressed = false;
        this.walkSoundCooldown = false;
        this.isCollidingWithHazard = false;
    }

    create() {
        const map = this.add.tilemap("platformer-level-1-map");
        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        const tileset = map.addTilesetImage("abstract-tileset", "tilemap_tiles_image");
        // Add layers
        const MountainLayer = map.createLayer("Mountains", tileset).setScrollFactor(0.5)
        const Mountain2Layer = map.createLayer("Mountains2", tileset).setScrollFactor(0.75)
        const groundLayer = map.createLayer("Ground", tileset);
        const interactiveLayer = map.createLayer("Interactable", tileset);
        const passLayer = map.createLayer("passThru", tileset);
        const hazardLayer = map.createLayer("Hazard", tileset);

        // Make it collidable
        groundLayer.setCollisionByProperty({collides: true});
        passLayer.forEachTile(tile => {
            if (tile.properties["passthrough"]) {
              tile.setCollision(false, false, true, false);
            }
        });
        hazardLayer.setCollisionByProperty({collides: true});

        // Call tile animation
        this.animatedTiles.init(map)
        // Add stars collectible 
        this.star = map.createFromObjects("Objects", {
            name: "stars",
            key: "tilemap_sheet",
            frame: 57
        });

        // Add wall object 
        this.wall = map.createFromObjects("Objects", {
            name: "wall",
            key: "tilemap_sheet",
            frame: 175
        });
        // Enable physics for each wall object
        this.wall.forEach(wall => {
            this.physics.world.enable(wall, Phaser.Physics.Arcade.STATIC_BODY);
        });
        // Create a group for the walls
        this.wallGroup = this.add.group(this.wall);

        // Add multiple sign objects
        this.signObjects = [
            { object: null, text: 'Left & Right Arrows to move\n       Space to Jump'},
            { object: null, text: 'Up arrow to climb' },
            { object: null, text: 'Collect all Stars to Win' }
        ];
        this.signObjects[0].object = map.createFromObjects("Objects", { name: "sign1", key: "tilemap_sheet", frame: 241 })[0];
        this.signObjects[1].object = map.createFromObjects("Objects", { name: "sign2", key: "tilemap_sheet", frame: 241 })[0];
        this.signObjects[2].object = map.createFromObjects("Objects", { name: "sign3", key: "tilemap_sheet", frame: 241 })[0];
        this.buttonObj = map.createFromObjects("Objects", { name: "button", key: "tilemap_sheet", frame: 166 })[0];
  
        // Start background music only once, even after restarting
        if (musicPlaying) {
            this.sound.play("bgMusic", {
                volume: 0.5,
                loop: true
            });
        }
        
        // Create animation for the star collectible
        this.anims.create({
            key: 'starAnimation', // Animation key
            frames: this.anims.generateFrameNumbers('tilemap_sheet', { start: 57, end: 60 }), // Frames to be used in the animation
            frameRate: 1,
            repeat: -1
        });
        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        // Apply the animation to all star objects
        this.star.forEach(star => {
            star.anims.play('starAnimation'); // Play the animation
            // Enable physics for each star object
            this.physics.world.enable(star, Phaser.Physics.Arcade.STATIC_BODY);
        });
        //this.physics.world.enable(this.star, Phaser.Physics.Arcade.STATIC_BODY);
        this.starGroup = this.add.group(this.star);

        // Create a timer for the delay of getting hurt
        this.hazardCollisionTimer = this.time.addEvent({
            delay: 2000,
            callback: this.resetHazardCollision,
            callbackScope: this,
            loop: false
        });

        this.scene.launch('uiScene');
        this.uiScene = this.scene.get('uiScene'); // Get reference to UI scene

        // // set up player avatar
        const p1Spawn = map.findObject("Objects", obj => obj.name === "PlayerSpawnPt");
        this.p1 = this.physics.add.sprite(p1Spawn.x, p1Spawn.y-55, "platformer_characters", "playerBlue_stand.png");
        // set player physics properties
        this.p1.body.setMaxVelocity(this.MAX_X_VEL, this.MAX_Y_VEL);
        this.p1.setScale(2);
        this.p1.body.setSize(this.p1.width/2);
        this.p1.body.setCollideWorldBounds(true);
        this.physics.world.enable(this.p1);
        // handle player collisions
        this.physics.world.bounds.setTo(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.add.collider(this.p1, groundLayer);
        this.physics.add.collider(this.p1, hazardLayer, () => {
            if (this.canDecrementHealth) {
                this.decrementHealth();
                this.startInvulnerability();
            }
        });
        this.physics.add.collider(this.p1, this.wallGroup);
        this.physics.world.TILE_BIAS = 50;
        this.physics.add.collider(this.p1, passLayer, this.onPlatform);

        // climbing
        this.physics.add.overlap(this.p1, interactiveLayer, this.onTileCollision, null, this);
        
        // Add star collision handler
        this.physics.add.overlap(this.p1, this.starGroup, (obj1, obj2) => {
            obj2.destroy();
            this.starSize--;
            this.sound.play("collectCoin", {volume: 0.5})
            if (this.starSize === 0) {
                this.transitionToWinLose(); // Transition to WinLose scene
                this.sound.play("winSound", {volume: 1});
            }
        });

        // Bind the removeWall method to the context of the class
        this.removeWall = this.removeWall.bind(this);

        // Create F prompt and sign text background
        this.signObjects.forEach(sign => {
            sign.textObject = this.add.text(sign.object.x, sign.object.y - 50, 'F', { fontSize: '64px', fill: '#BD1AB9 ', fontStyle: 'Bold' }).setOrigin(0.5).setVisible(false);
            // Add a tween animation to the "F" text
            this.tweens.add({
                targets: sign.textObject,
                scale: 1.2,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
        this.interactionTextBackground = this.add.graphics();
        this.interactionText = this.add.text(0, 0, '', { fontSize: '32px', fill: '#fff', backgroundColor: '#8B4513' }).setOrigin(0.5).setVisible(false);

        // Create F prompt for button object
        this.buttonObj.textObject = this.add.text(this.buttonObj.x, this.buttonObj.y - 50, 'F', { fontSize: '64px', fill: '#BD1AB9 ', fontStyle: 'Bold' }).setOrigin(0.5).setVisible(false);
        this.buttonObj.tween = this.tweens.add({
            targets: this.buttonObj.textObject,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-R', this.restartScene, this);
        this.spcKey = this.input.keyboard.addKey('SPACE');
        // Set up key listener for debug
        // this.input.keyboard.on('keydown-Y', this.decrementHealth, this);

        // Debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            // this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            // this.physics.world.debugGraphic.clear();
            console.log("Player location: ",this.p1.body.x, this.p1.body.y);
            console.log("Stargroup: ",this.starGroup.getLength());
        }, this);

        // Interact button
        this.input.keyboard.on('keydown-F', this.showInteractionText, this);
        // Creating walking particles
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_05.png', 'smoke_07.png'],
            random: true,
            scale: {start: 0.03, end: 0.3},
            lifespan: 350,
            gravityY: 400,
            alpha: {start: 1, end: 0.1}, 
        });
        my.vfx.walking.stop();
        // Creating jumping particles
        my.vfx.jumping = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_01.png', 'smoke_02.png', 'smoke_03.png'], // Different smoke frames
            randomFrame: true,
            scale: { start: 0.3, end: 0.1 },
            lifespan: { min: 300, max: 500 },
            speed: { min: 100, max: 200 },
            angle: { min: 240, max: 300 },
            gravityY: 500,
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD'
        });
        my.vfx.jumping.stop();

        // Camera
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        // console.log(map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.p1, true, 0.25, 0.25) // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50)
        this.cameras.main.setZoom(this.SCALE);
        this.p1.anims.play('idle');
    }

    update() {
        let isMoving = false;
        let isOnGround = this.p1.body.blocked.down;

        if (this.playerCanMove) {
            if(cursors.left.isDown) {
                this.p1.body.setAccelerationX(-this.ACCELERATION);
                this.p1.setFlip(true, false);
                this.p1.anims.play('walk', true);
                my.vfx.walking.startFollow(this.p1.body, this.p1.displayWidth/2+20, this.p1.displayHeight/2+50, false);
                my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
                isMoving = true;
                if (isOnGround) {
                    my.vfx.walking.start();
                }
            } else if(cursors.right.isDown) {
                this.p1.body.setAccelerationX(this.ACCELERATION);
                this.p1.resetFlip();
                this.p1.anims.play('walk', true);
                my.vfx.walking.startFollow(this.p1.body, this.p1.displayWidth/2-20, this.p1.displayHeight/2+50, false);
                my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);
                isMoving = true;
                if (isOnGround) {
                    my.vfx.walking.start();
                }
            } else {
                // Set acceleration to 0 and have DRAG take over
                this.p1.anims.play('idle');
                this.p1.body.setAccelerationX(0);
                this.p1.body.setDragX(this.DRAG);
                my.vfx.walking.stop();
                isMoving = false;
            }
            if (isMoving && isOnGround && !this.walkSoundCooldown) {
                this.sound.play ("walkSound", {volume: 0.3})
                this.walkSoundCooldown = true; 
                this.time.delayedCall(500, () => {
                    this.walkSoundCooldown = false;
                });
            }

        }
        // Stop walking particles if player is not on the ground
        if (!isOnGround) {
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(this.p1.body.blocked.down && Phaser.Input.Keyboard.JustDown(this.spcKey)) {
            this.p1.body.setVelocityY(this.JUMP_VELOCITY);
            this.sound.play("jumpSound", {volume: 0.5});
            // Trigger jumping particle effect
            my.vfx.jumping.setPosition(this.p1.x, this.p1.y + this.p1.displayHeight / 2); // Position at player's feet
            my.vfx.jumping.explode(20); // Number of particles
        }
        if(!this.p1.body.blocked.down) {
            this.p1.anims.play('jump');
        }

        // Show "F" prompt when near sign
        this.signObjects.forEach(sign => {
            if (Phaser.Geom.Intersects.RectangleToRectangle(this.p1.getBounds(), sign.object.getBounds())) {
                sign.textObject.setVisible(true);
            } else {
                sign.textObject.setVisible(false);
            }
        });

        // Show "F" prompt when near button
        if (Phaser.Geom.Intersects.RectangleToRectangle(this.p1.getBounds(), this.buttonObj.getBounds())) {
            this.buttonObj.textObject.setVisible(true);
        } else {
            this.buttonObj.textObject.setVisible(false);
        }
    }

    restartScene() {
        this.playerHealth = 3;
        this.starSize = 60;
        this.uiScene.updateHearts(this.playerHealth); // Update UI hearts display
        this.scene.restart();
        musicPlaying = false;
    }

    decrementHealth() {
        if (this.playerHealth > 0) {
            console.log("Decreasing health");
            this.playerHealth--;
            this.sound.play("damageSound", {volume: 0.5});
            this.uiScene.updateHearts(this.playerHealth);
            if (this.playerHealth === 0) {
                this.transitionToWinLose(); // Transition to WinLose scene
                this.sound.play("loseSound", {volume: 1});
            }
        }
        console.log(this.playerHealth);
    }

    startInvulnerability() {
        this.canDecrementHealth = false;
        // Create the tween for fading in and out
        const fadeTween = this.tweens.add({
            targets: this.p1,
            alpha: 0,
            yoyo: true,
            repeat: -1,
            duration: 200
        });

        // After 2 seconds, stop the tween and reset alpha
        this.time.delayedCall(2000, () => {
            fadeTween.stop();
            this.p1.setAlpha(1);
            this.canDecrementHealth = true;
        });
    }

    // Function to handle tile collisions
    onTileCollision(player, tile) {
        // Check if the colliding tile has the 'climbable' property
        if (tile.properties && tile.properties.climbable && cursors.up.isDown) {
            this.p1.anims.play('climb', true);
            this.p1.body.setVelocityY(-this.ACCELERATION);
        }
    }

    transitionToWinLose() {
        this.scene.get('uiScene').events.emit('disableUI');
        this.scene.start('winLoseScene', {
            starSize: this.starSize,
            playerHealth: this.playerHealth
        });
    }

    showInteractionText() {
        const sign = this.signObjects.find(sign => sign.textObject.visible);
        if (sign) {
            this.sound.play("signSound", {volume: 0.5})
            this.interactionText.setText(sign.text);
            this.interactionText.setPosition(sign.object.x, sign.object.y - 120);
            this.interactionText.setVisible(true);
            this.interactionTextBackground.clear();
            this.interactionTextBackground.fillStyle(0x8B4513, 1);
            this.interactionTextBackground.fillRect(
                this.interactionText.x - this.interactionText.width / 2,
                this.interactionText.y - this.interactionText.height / 2,
                this.interactionText.width,
                this.interactionText.height
            );
    
            // Popup and shake animation
            this.tweens.add({
                targets: this.interactionText,
                scale: { from: 0.1, to: 1 },
                duration: 500,
                ease: 'Elastic.easeOut'
            });
            this.tweens.add({
                targets: this.interactionText,
                x: '+=10',
                yoyo: true,
                repeat: 5,
                duration: 50,
                ease: 'Sine.easeInOut'
            });
    
            this.time.delayedCall(3000, () => {
                this.interactionText.setVisible(false);
                this.interactionTextBackground.clear();
            });  
        }
        else if (this.buttonObj.textObject.visible) {
            this.buttonObj.setFrame(167);
            this.buttonPress();
        }
    }

    removeWall() {
        const wallObjects = this.wallGroup.getChildren(); // Get all wall objects
        const totalDuration = 3000; // Total duration for the removal process (3 seconds)
        const delayBetweenRemovals = totalDuration / wallObjects.length; // Calculate delay between each removal
        // Iterate over the wall objects and schedule their removal
        wallObjects.forEach((wall, index) => {
            this.time.delayedCall(delayBetweenRemovals * index, () => {
                // Add a tween to fade out the wall before removing it
                this.tweens.add({
                    targets: wall,
                    alpha: 0,
                    duration: delayBetweenRemovals / 2,
                    onComplete: () => {
                        wall.destroy(); // Remove the wall object
                    }
                });
            });
        });
    }

    buttonPress() {
        if (!this.buttonPressed) {
            // Stop following the player and disable player movement
            this.sound.play("buttonClick", {volume: 0.7});
            this.cameras.main.stopFollow();
            this.p1.body.setAllowGravity(false);
            this.p1.body.setVelocityX(0);
            this.p1.body.setVelocityY(0);
            this.playerCanMove = false;  // Disable player movement
            // Get the current position of the player
            const playerCurrentX = this.p1.x;
            const playerCurrentY = this.p1.y;
            this.sound.play("rotateStone", {volume: 0.4});
            // Move the camera to position (3975, 532) in a constant fashion
            this.cameras.main.pan(3975, 532, 1000, 'Linear', false, (camera, progress) => {
                if (progress === 1) {
                    // Call removeWall function after the camera has finished panning
                    this.removeWall();
                    // Upon calling removeWall function, wait 3 second
                    this.time.delayedCall(3000, () => {
                        // Have the camera travel back to the player's current position in a constant rate
                        this.cameras.main.pan(playerCurrentX, playerCurrentY, 1000, 'Linear', false, (camera, progress) => {
                            if (progress === 1) {
                                // Start following the player with the camera and enable player movement
                                this.cameras.main.startFollow(this.p1);
                                this.p1.body.setAllowGravity(true);
                                this.playerCanMove = true;  // Re-enable player movement
                            }
                        });
                    });
                }
            });
        }
        this.buttonPressed = true; //Button can only be pressed once
    }
}