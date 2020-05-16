export default (resource: string) =>
  `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="utf-8" />
    <title>404</title>
  </head>
  <style>
  html,
  body {
    height: 100%;
    width: 100%;
    font-family: Helvetica, Arial, sans-serif;
    box-sizing: border-box;
    background-color: #fff;
  }
  
  #denoliver {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  #denoliver > h1 {
    font-size: 48px;
    margin-bottom: 0;
    color: #726f7b;
  }
  
  #denoliver > p {
    color: #c4c4c4;
    text-align: center;
  }
  
  #denoliver > div {
    display: flex;
  }
  
  #denoliver span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #89b3dd;
    margin-right: 16px;
  }
  
  #denoliver span:nth-child(1) {
    background-color: #d4a7f1;
  }
  
  #denoliver span:nth-child(3) {
    background-color: #a2eee9;
  }
  
  #denoliver span:last-child {
    margin-right: 0;
  }
  
  strong {
    opacity: 0.2;
    font-weight: 200;
  }
  
  </style>
  <body>
    <div id="denoliver">
      <h1>404</h1>
      <p>Requested resource: ${resource} does not exist.</p>
      <div>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </body>
</html>

`;
