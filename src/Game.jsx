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
        this.load.image('background1', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('background2', 'https://labs.phaser.io/assets/skies/nebula.jpg');
        this.load.image('background3', 'https://labs.phaser.io/assets/skies/deepblue.png');
        this.load.image('background4', 'https://labs.phaser.io/assets/skies/starfield.jpg');
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
        this.load.image('bullet', 'https://labs.phaser.io/assets/sprites/bullet.png');
        this.load.image('enemy', 'https://labs.phaser.io/assets/sprites/evil-bunny.png');
        this.load.image('coin', 'https://labs.phaser.io/assets/sprites/coin.png');
      }

      create() {
        // Background
        this.background = this.add.image(400, 300, 'background1');

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
        this.killCount = 0;
        this.missedCount = 0;
        this.highScore = parseInt(localStorage.getItem('highScore'), 10) || 0;

        // High Score display (top left)
        this.highScoreText = this.add.text(10, 10, `High Score: ${this.highScore}`, {
          fontSize: '20px',
          color: '#ffffff',
        });

        this.killText = this.add.text(620, 10, 'Kill Count: 0', {
          fontSize: '20px',
          color: '#ffffff',
        });
        this.missedText = this.add.text(620, 30, 'Missed Count: 0', {
          fontSize: '20px',
          color: '#ffffff',
        });

        // Speed variables
        this.speedMultiplier = 1;
        this.baseBulletSpeed = 400;
        this.baseEnemySpeed = 50;

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keySpace = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        // Touch/Pointer controls for mobile
        this.input.on('pointermove', (pointer) => {
          if (this.state !== 'PLAYING') return;
          this.player.x = Phaser.Math.Clamp(pointer.x, 0, this.scale.width);
          this.player.y = Phaser.Math.Clamp(pointer.y, 0, this.scale.height);
        });

        this.input.on('pointerdown', () => {
          if (this.state === 'PLAYING') this.shootBullet();
        });

        // Enemy Spawn Timer
        this.spawnTimer = this.time.addEvent({
          delay: 1000,
          callback: this.spawnEnemy,
          callbackScope: this,
          loop: true,
          paused: true,
        });

        // Start Button and Game Over Text
        this.startText = this.add
          .text(400, 300, 'START', {
            fontSize: '32px',
            fontFamily: 'monospace',
            backgroundColor: '#000',
            color: '#ffff00',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setInteractive()
          .on('pointerdown', () => this.startGame());

        this.gameOverText = this.add
          .text(400, 250, 'GAME OVER', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ff0000',
          })
          .setOrigin(0.5)
          .setVisible(false);

        this.physics.pause();
        this.state = 'START';

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
        if (this.state !== 'PLAYING') return;

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
              this.missedCount += 1;
              this.missedText.setText(`Missed Count: ${this.missedCount}`);
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
        if (this.state !== 'PLAYING') return;
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

        this.killCount += 1;
        this.killText.setText(`Kill Count: ${this.killCount}`);

        if (this.killCount > this.highScore) {
          this.highScore = this.killCount;
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
        if (this.killCount > this.highScore) {
          this.highScore = this.killCount;
          localStorage.setItem('highScore', String(this.highScore));
          this.highScoreText.setText(`High Score: ${this.highScore}`);
        }

        this.endGame();
      }

      startGame() {
        this.state = 'PLAYING';
        this.physics.resume();
        this.spawnTimer.paused = false;
        this.startText.setVisible(false);
        this.gameOverText.setVisible(false);
        this.killCount = 0;
        this.missedCount = 0;
        this.killText.setText('Kill Count: 0');
        this.missedText.setText('Missed Count: 0');
        this.speedMultiplier = 1;
      }

      endGame() {
        this.state = 'GAME_OVER';
        this.physics.pause();
        this.spawnTimer.paused = true;
        this.bullets.clear(true, true);
        this.enemies.clear(true, true);
        this.gameOverText.setVisible(true);
        this.startText.setText('RESTART').setVisible(true);
      }

      changeBackground(key) {
        if (this.background) {
          this.background.setTexture(key);
        }
      }
    }

    // Initialize Phaser Game
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: 'phaser-container',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: MainScene,
    });

    const resize = () => {
      gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      gameRef.current.destroy(true);
      gameRef.current = null;
      window.removeEventListener('resize', resize);
    };
  }, []);

  const changeBackground = (key) => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.keys['MainScene'];
      if (scene && scene.changeBackground) {
        scene.changeBackground(key);
      }
    }
  };

  return (
    <div className="game-wrapper">
      <div className="bg-options">
        <button onClick={() => changeBackground('background1')}>BG1</button>
        <button onClick={() => changeBackground('background2')}>BG2</button>
        <button onClick={() => changeBackground('background3')}>BG3</button>
        <button onClick={() => changeBackground('background4')}>BG4</button>
      </div>
      <div id="phaser-container" />
    </div>
  );
}
