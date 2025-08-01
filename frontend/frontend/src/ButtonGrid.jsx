import React from 'react';
import styled from 'styled-components';
import PadButton from './PadButton.jsx';
import './Landing.css';

const ButtonGrid = ({ buttons }) => {
  // group into pairs for layout
  const buttonPairs = [];
  for (let i = 0; i < buttons.length; i += 2) {
    buttonPairs.push(buttons.slice(i, i + 2));
  }

  return (
    <StyledWrapper>
      <div className="main">
        <div className="buttons">
          {buttonPairs.map((pair, i) => (
            <div key={i} className="button_pair">
              {pair.map((btn, j) => (
                <PadButton
                  key={j}
                  className={btn.className}
                  svgPath={btn.svgPath}
                  onClick={btn.onClick}
                >
                  {btn.text}
                </PadButton>
              ))}
            </div>
          ))}
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* Teenage Engineering [EP-133 K.O. II] - Buttons */

  .main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: 1.25em;
  }

  .buttons {
    display: flex;
    flex-direction: column;
    row-gap: 1.5em;
  }
  .button_pair {
    display: flex;
    column-gap: 0.5em;
  }
  .button_pair1 {
    display: flex;
    flex-direction: column;
    row-gap: 0.9em;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5em;
    height: 5em;
    background-color: #171717;
    border-radius: 5px;
  }

  .button1 {
    width: 3.7em;
    height: 3.7em;
    border-radius: 10px;
    border: none;
    outline: none;
    background-color: #c7c3c0;
    box-shadow: rgba(0, 0, 0, 0.377) 10px 10px 8px,
      #ffffff 1.5px 1.5px 2px 0px inset, #c7c3c0 -3.2px -3.2px 8px 0px inset;
    cursor: pointer;
    font-family: Montserrat;
    transition: 0.1s ease-in-out;
  }
  .button2 {
    width: 3.7em;
    height: 3.7em;
    border-radius: 10px;
    border: none;
    outline: none;
    background-color: #c7c3c0;
    box-shadow: rgba(0, 0, 0, 0.377) 10px 10px 8px,
      #ffffff 1.5px 1.5px 2px 0px inset, #c7c3c0 -3.2px -3.2px 8px 0px inset;
    cursor: pointer;
    font-family: Montserrat;
    transition: 0.1s ease-in-out;
  }
  .svg1 {
    fill: #5f5f5f;
    width: 25px;
    height: 25px;
    transition: 0.1s ease-in-out;
  }
  .svg2 {
    fill: #5f5f5f;
    width: 25px;
    height: 25px;
    transition: 0.1s ease-in-out;
  }

  .button3 {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    width: 4.8em;
    height: 3.7em;
    border-radius: 10px;
    border: none;
    outline: none;
    background-color: #d42a02;
    box-shadow: rgba(0, 0, 0, 0.377) 10px 10px 8px, #fb702c 2px 2px 10px 0px inset,
      #d42a02 -4px -4px 1px 0px inset;
    cursor: pointer;
    font-family: Montserrat;
    transition: 0.1s ease-in-out;
  }
  .button4 {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    width: 6em;
    height: 3.7em;
    border-radius: 10px;
    border: none;
    outline: none;
    background-color: #545251;
    box-shadow: rgba(0, 0, 0, 0.377) 10px 10px 8px,
      #a8a6a4 1.5px 1.5px 1px 0px inset, #545251 -3.2px -3.2px 8px 0px inset;
    cursor: pointer;
    font-family: Montserrat;
    transition: 0.1s ease-in-out;
  }

  .button_text {
    color: white;
    padding-top: 0.1em;
    letter-spacing: 0.075em;
    font-size: 0.4em;
    transition: 0.1s ease-in-out;
  }

  .text {
    font-family: Montserrat;
    text-align: center;
    font-size: 0.65em;
  }

  .button1:active,
  .button2:active {
    box-shadow: rgba(0, 0, 0, 0.377) 0px 0px 0px, inset 0.5px 0.5px 4px #000000,
      #c7c3c0 -3.2px -3.2px 8px 0px inset;
  }
  .button1:active .svg1,
  .button2:active .svg2 {
    scale: 0.95;
  }
  .button3:active {
    box-shadow: rgba(0, 0, 0, 0.377) 0px 0px 0px, inset 0.5px 0.5px 4px #000000,
      #d42a02 -3.2px -3.2px 8px 0px inset;
  }
  .button3:active .button_text {
    transform: translateY(0.5px);
  }
  .button4:active {
    box-shadow: rgba(0, 0, 0, 0.377) 0px 0px 0px, inset 0.5px 0.5px 4px #000000,
      #545251 -3.2px -3.2px 8px 0px inset;
  }
  .button4:active .button_text {
    transform: translateY(0.5px);
  }`;

export default ButtonGrid;