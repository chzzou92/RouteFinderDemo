import React from "react";
import styled from "styled-components";

const TimeButton = (props) => {
  const hours = Math.floor(props.time / 60);
  const minutes = props.time % 60;
  const label = `${hours > 0 ? `${hours}H ` : ""}${minutes}M`;
  return (
    <StyledWrapper>
      <button>{props.time != -1 ? label : "Error!"}</button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: absolute;
  top: 05%;
  left: 50%;
  z-index: 1000;

  button {
    width: 120px;
    height: 50px;
    border: 3px solid #315cfd;
    border-radius: 45px;
    transform-origin: center;
    transition: all 0.3s;
    cursor: pointer;
    background: white;
    font-size: 1em;
    font-weight: 550;
    color: black;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  button:hover {
    background: #315cfd;
    color: white;
    font-size: 1.1em;
  }
`;

export default TimeButton;
