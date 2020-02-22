import React from 'react';
import Game from "reactified-phaser/Game"
import {observable} from "mobx"
import {observer} from "mobx-react"


// Using MobX as a means to bridge state between React and Phaser.
// I use MobX stores for all my state generally.
//
// For this toy example this is obviously makes showing the score
// more complicated, but for more complex UIs it works really nicely.
//
// MobX is my preferred solution, I'm sure RxJS or even Redux could work
// fine as well! Probably vanilla react even!
class ScoreStore {
    @observable
    score: number = 0
}
const scoreStore = new ScoreStore()

let player:Phaser.Physics.Arcade.Sprite | undefined
let stars:Phaser.Physics.Arcade.Group | undefined ;
let bombs: Phaser.Physics.Arcade.Group | undefined;
let platforms: Phaser.Physics.Arcade.StaticGroup | undefined;
let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
let gameOver = false;

// In the Phaser config below I actually pass `this` in as an argument
// so I can leverage intellisense
function preload (scene: Phaser.Scene) {
    scene.load.image('sky', '/assets/sky.png');
    scene.load.image('ground', '/assets/platform.png');
    scene.load.image('star', '/assets/star.png');
    scene.load.image('bomb', '/assets/bomb.png');
    scene.load.spritesheet('dude', '/assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

function create (scene: Phaser.Scene) {
    //  A simple background for our game
    scene.add.image(400, 300, 'sky');

    //  The platforms group contains the ground and the 2 ledges we can jump on
    platforms = scene.physics.add.staticGroup();

    //  Here we create the ground.
    //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    //  Now let's create some ledges
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // The player and its settings
    player = scene.physics.add.sprite(100, 450, 'dude');

    //  Player physics properties. Give the little guy a slight bounce.
    player!.setBounce(0.2);
    player!.setCollideWorldBounds(true);

    //  Our player animations, turning, walking left and walking right.
    scene.anims.create({
        key: 'left',
        frames: scene.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    scene.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });

    scene.anims.create({
        key: 'right',
        frames: scene.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    //  Input Events
    cursors = scene.input.keyboard.createCursorKeys();

    //  Some stars to collect, 12 in total, evenly spaced 70 pixels apart along the x axis
    stars = scene.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });

    stars.children.iterate(function (child) {
        //  Give each star a slightly different bounce
        (child as unknown as Phaser.Physics.Arcade.Body).setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));

    });
    bombs = scene.physics.add.group();

    //  Collide the player and the stars with the platforms
    scene.physics.add.collider(player, platforms);
    scene.physics.add.collider(stars, platforms);
    scene.physics.add.collider(bombs, platforms);

    //  Checks to see if the player overlaps with any of the stars, if he does call the collectStar function
    //  Checks to see if the player overlaps with any of the stars, if he does call the collectStar function
    scene.physics.add.overlap(player, stars, collectStar, undefined, scene);
    scene.physics.add.collider(player, bombs, hitBomb, undefined, scene);
}

function update () {
    if (gameOver) {
        return;
    }

    if (cursors!.left!.isDown) {
        player!.setVelocityX(-160);
        player!.anims.play('left', true);
    }
    else if (cursors!.right!.isDown) {
        player!.setVelocityX(160);
        player!.anims.play('right', true);
    }
    else {
        player!.setVelocityX(0);
        player!.anims.play('turn');
    }

    if (cursors!.up!.isDown && player!.body.touching.down) {
        player!.setVelocityY(-330);
    }
}

function collectStar (player: any, star: any) {
    star.disableBody(true, true);
    //  Add and update the score *in the shared scoreStore*
    scoreStore.score += 10;
    if (stars!.countActive(true) === 0)
    {
        //  A new batch of stars to collect
        stars!.children.iterate(function (child:any) {
            (child as any).enableBody(true, child.x, 0, true, true);
        });

        let x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        let bomb = bombs!.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.allowGravity = false;
    }
}

function hitBomb (player: any) {
    // @ts-ignore
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
    gameOver = true;
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {

        // I know it looks a little weird passing `this` in like this,
        // but this means `preload` and `create` will have a `scene`
        // argument (that's what I call it anyway) that benefits
        // from intellisense because the type of `scene` will be known
        // in the function body.
        preload: function() { preload(this as unknown as Phaser.Scene) },
        create: function() { create(this as unknown as Phaser.Scene) },
        update: update
    }
};

function App() {
  return (
    <div className="App">
        <ExampleGame/>
    </div>
  );
}

const ExampleGame = observer(() =>
    <Game config={config}>
        {/*Game GUI goes here, (children of the `<Game>` component).*/}
        {/*Stuff here is styled to fit within the game canvas dimensions.*/}
        <div style={{
            position: "relative",
            fontSize: 32,
            color: "#ededed",
            top: config.height - 48,
            left: 32
        }}>
            Score: {scoreStore.score}
        </div>
    </Game>
)

export default App;
