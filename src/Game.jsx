// src/Game.jsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function Game() {
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return; // don’t recreate on React re-render

    class MainScene extends Phaser.Scene {
      constructor() {
        super('MainScene');
      }

      preload() {
        this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
        this.load.image('bullet', 'https://labs.phaser.io/assets/sprites/bullet.png');
        this.load.image('enemy', 'https://labs.phaser.io/assets/sprites/evil-bunny.png');
        this.load.image('coin', 'https://labs.phaser.io/assets/sprites/coin.png');
      }

      create() {
        // Background
        this.add.image(400, 300, 'background');

        // Player Setup
        this.player = this.physics.add.sprite(400, 500, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.5);

        // Bullets Pool
        this.bullets = this.physics.add.group({
          defaultKey: 'bullet',
          maxSize: 30,
        });

        // Enemies Pool
        this.enemies = this.physics.add.group({ defaultKey: 'enemy', maxSize: 20 });

        // Score Tracking
        this.coinCount = 0;
        this.highScore = parseInt(localStorage.getItem('highScore'), 10) || 0;

        // High Score display (top left)
        this.highScoreText = this.add.text(10, 10, `High Score: ${this.highScore}`, {
          fontSize: '20px',
          color: '#ffffff',
        });

        this.add.image(760, 20, 'coin').setScale(0.5);
        this.coinText = this.add.text(780, 10, '0', {
          fontSize: '20px',
          color: '#ffffff',
        });

        // Speed variables
        this.speedMultiplier = 1;
        this.baseBulletSpeed = 400;
        this.baseEnemySpeed = 100;

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Enemy Spawn Timer
        this.time.addEvent({
          delay: 1000,
          callback: this.spawnEnemy,
          callbackScope: this,
          loop: true,
        });

        // Overlaps
        this.physics.add.overlap(
          this.bullets,
          this.enemies,
          this.handleBulletEnemyCollision,
          null,
          this
        );

        this.physics.add.overlap(
          this.player,
          this.enemies,
          this.handlePlayerEnemyCollision,
          null,
          this
        );
      }

      update(time, delta) {
        // PLAYER MOVEMENT
        const speed = 200;
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
          this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
          this.player.setVelocityX(speed);
        }

        if (this.cursors.up.isDown) {
          this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
          this.player.setVelocityY(speed);
        }

        // SHOOTING
        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
          this.shootBullet();
        }

        // MANUAL BULLET MOVEMENT (if not using physics velocity)
        this.bullets.children.each((bullet) => {
          if (bullet.active) {
            bullet.y -= this.baseBulletSpeed * this.speedMultiplier * (delta / 1000);
            if (bullet.y < -50) {
              bullet.setActive(false);
              bullet.setVisible(false);
              bullet.body.enable = false;
            }
          }
        });

        // MANUAL ENEMY MOVEMENT (if not using physics velocity)
        this.enemies.children.each((enemy) => {
          if (enemy.active) {
            enemy.y += this.baseEnemySpeed * this.speedMultiplier * (delta / 1000);
            if (enemy.y > 650) {
              enemy.setActive(false);
              enemy.setVisible(false);
              enemy.body.enable = false;
            }
          }
        });
      }

      shootBullet() {
        const bullet = this.bullets.get();

        if (bullet) {
          bullet.enableBody(true, this.player.x, this.player.y - 20, true, true);
          bullet.setScale(0.5);
          // If you want physics-driven movement, use this:
          bullet.setVelocityY(-this.baseBulletSpeed * this.speedMultiplier);
          // If you prefer manual update (as above), skip setVelocityY.
        }
      }

      spawnEnemy() {
        const x = Phaser.Math.Between(50, 750);
        const enemy = this.enemies.get(x, -50);

        if (enemy) {
          enemy.enableBody(true, x, -50, true, true);
          enemy.setScale(0.5);
          // Either physics velocity:
          enemy.setVelocityY(this.baseEnemySpeed * this.speedMultiplier);
          // Or rely on manual movement in update().
        }
      }

      handleBulletEnemyCollision(bullet, enemy) {
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.enable = false;

        enemy.setActive(false);
        enemy.setVisible(false);
        enemy.body.enable = false;
        const coin = this.add.image(enemy.x, enemy.y, 'coin').setScale(0.5);
        this.tweens.add({
          targets: coin,
          y: coin.y - 50,
          alpha: 0,
          duration: 500,
          onComplete: () => coin.destroy(),
        });

        this.coinCount += 1;
        this.coinText.setText(String(this.coinCount));

        if (this.coinCount > this.highScore) {
          this.highScore = this.coinCount;
          this.highScoreText.setText(`High Score: ${this.highScore}`);
          localStorage.setItem('highScore', String(this.highScore));
        }

        // Speed up game each time an enemy is destroyed
        this.speedMultiplier *= 1.05;
      }

      handlePlayerEnemyCollision(player, enemy) {
        enemy.setActive(false);
        enemy.setVisible(false);
        enemy.body.enable = false;

        // Save high score at end of game
        if (this.coinCount > this.highScore) {
          this.highScore = this.coinCount;
          localStorage.setItem('highScore', String(this.highScore));
        }

        // e.g. reduce health, restart scene, or game over
        this.scene.restart();
      }
    }

    // Initialize Phaser Game
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'phaser-container',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: MainScene,
    });

    return () => {
      gameRef.current.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="phaser-container" />;
}