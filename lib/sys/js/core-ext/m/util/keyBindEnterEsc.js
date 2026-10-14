
function keyBindEnterEsc(callbackOK, callbackCancel)
{
  return function(event)
  {
    if(event.keyCode === 13 || event.key === "Enter")
    {
      if(typeof callbackOK === "function")
      {
        callbackOK();
      }
      return false;
    }
    else if(event.keyCode === 27 || event.key === "Escape")
    {
      if(typeof callbackCancel === "function")
      {
        callbackCancel();
      }
      return false;
    }
    return true;
  };
}
