"use strict";


class ObjectSettings {

  lastGoodValue = 0;
  FirstWrongValue = Number.NaN;
  lastWrongValue = Number.NaN;
  counterResetDetetion_CurrentCountAfterReset = 0;
  initialFinished = false;

  /**
  * Generate new ObjectSettingsClass
  * @param {string} namespace
  * @param {ioBroker.Object } iobrokerObject
 */
  constructor(iobrokerObject, namespace) {

    this.iobrokerObject = iobrokerObject
    this.namespace = namespace

    
  }

 


  get myCustomSettings() {
    if (this.iobrokerObject.common.custom) {
      return this.iobrokerObject.common.custom[this.namespace]
    }
    return null
  }

  get alias() {
    let ret = this.myCustomSettings.alias

    if (ret == null || ret == undefined || ret === "") {
      ret = this.iobrokerObject._id.replace(/[.]/g, '_')
    }
    return String(ret)
  }

  get id() { return this.iobrokerObject._id }

  get counterResetDetetion_CountAfterReset() { return Number(this.myCustomSettings.counterResetDetetion_CountAfterReset) }

  get output_unit() {
    let ret = this.myCustomSettings.output_unit
    if (ret === null || ret === "" || ret == undefined) {
      ret = this.iobrokerObject.common.unit
      return ret
    }
  }
  get output_multiplier() { return Number(this.myCustomSettings.output_multiplier) }

  get counterResetDetection() { return (Boolean)(this.myCustomSettings.counterResetDetection) }




  /**
* Update the iobroker Object
* @param {ioBroker.Object } iobrokerObject
*/
  updateSettings(iobrokerObject) {
    let OldAlias = this.alias
    this.iobrokerObject = iobrokerObject
    if (OldAlias != this.alias)
    {
      this.lastGoodValue = 0
      this.FirstWrongValue = Number.NaN
      this.lastWrongValue = Number.NaN
      this.counterResetDetetion_CurrentCountAfterReset = 0
      this.initialFinished = false
    
    }
    this.initialFinished = false
  }

  /**
* returns the 
* @param {string} TimePeriod
* @returns {boolean}
*/
  detailed(TimePeriod) {
    if (TimePeriod == "Minute" || TimePeriod == "Hour")
      return false
    return this.myCustomSettings["detailed_" + TimePeriod.toLowerCase() + "s"]

  }

  /**
* returns the Count of Current/Previous Datapoints
* @param {string} TimePeriod
* @returns {number}
*/
  beforeCount(TimePeriod) {
    return this.myCustomSettings["before_" + TimePeriod.toLowerCase() + "s"]
  }
}
module.exports = ObjectSettings