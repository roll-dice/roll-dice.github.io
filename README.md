# &lt;roll-dice> Web Component

## Minimal path to happiness

```html
<script type="module" src="https://roll-dice.github.io/element.js"></script>

<roll-dice></roll-dice>
```

## Example: https://roll-dice.github.io/


Original Blog Roll dice with ThreeJS and CannonJS:  
https://tympanus.net/codrops/2023/01/25/crafting-a-dice-roller-with-three-js-and-cannon-es/

## &lt;roll-dice> Web Component attributes

### &lt;roll-dice> Dice attributes
| Attribute | Description | Default | Comment |
| --- | --- | --- | --- |
| `dicecount` | Total number of dice to throw | `5` |
| `dicecolor` | Color of the dice | `white` |
| `dotcolor` | Color of the dots | `black` |
| `dicehovercolor` | Dicecolor on mouseover | `beige` |
| `diceselectedcolor` | Dicecolor for selected dice | `lightgreen` |
### &lt;roll-dice> Throw Attributes

| Attribute | Description | Default | Comment |
| --- | --- | --- | --- |
| `diceimpulse` | Throw the dice | `5` | force applied to throwing dice |
| `dicerotation` | Dice rotation | `0.6` | 0 = die drops straight down |

### &lt;roll-dice> Physics Attributes
| Attribute | Description | Default | Comment |
| --- | --- | --- | --- |
| `gravityx` | gravity Left Right | `-4` | negative = left, positive = right |
| `gravityy` | gravity Down Up | `50` | negative = down, positive = up |
| `gravityz` | gravity Backward Forward| `0` | negative = backward, positive = forward |
| `mass` | mass | `1.5` | |
| `restitution` | restitution | `0.6` | 0 = no bounce |
| `nudge` | nudge force | `1` | when die get stuck, nudge it with this force |


### &lt;roll-dice> Camera Attributes

| Attribute | Description | Default | Comment |
| --- | --- | --- | --- |
| `cameradistance` | distance from the boardfloor | `5` |
| `cameratilt` | tilt camera backward | `1` | 0 = no tilt |
| `cameraview` | Camera (wide) angle | `40` | higher is wider and farther away from dice
| `camerapan` | camera pan | `0` | negative = left, positive = right

## &lt;roll-dice> aligning the dice

| Attribute | Description | Default | Comment |
| --- | --- | --- | --- |
| `aligndice` | Array in String "X,Y,Z" | based on dicecount |

## &lt;roll-dice> standard properties and methods

### Properties

| name | description |  
| --- | --- |
| `dice` | Array of all dice |

### Methods

| name | description |  
| --- | --- |
| `roll()` | roll all **unselected** dice |
## &lt;roll-dice> dispatched Event ``roll-dice`` - standard properties

| property | |  |
| --- | --- | --- |
| `dice` | Array of all dice |
| `` |  |

## &lt;roll-dice> dispatched Events - eventtype properties

| eventtype | eventtype | properties |
| --- | --- | --- |
| `dice-rolled` | dice-rolled |  |
| `dice-selected` | dice-selected | selecteddice |

### Example: listen to ``roll-dice`` event

````javascript
document.addEventlistener('roll-dice', (e) => {
  console.log(e.detail.dice);
});
````


