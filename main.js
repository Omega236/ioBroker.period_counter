"use strict";

/*
* Created with @iobroker/create-adapter v1.27.0
*/

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core")

const cron = require('node-cron') // Cron Schedulervar

const ObjectSettings = require('./ObjectSettings.js')

const TimePeriods = {
  Minute: "Minute",
  Hour: "Hour",
  Day: "Day",
  Week: "Week",
  Month: "Month",
  Quarter: "Quarter",
  Year: "Year"
}


const TimePeriodsZahl = {
  Minute: "001",
  Hour: "002",
  Day: "01",
  Week: "02",
  Month: "03",
  Quarter: "04",
  Year: "05"
}

// Load your modules here, e.g.:
// const fs = require("fs");

class PeriodCounter extends utils.Adapter {

  /**
  * @param {Partial<utils.AdapterOptions>} [options={}]
  */
  constructor(options) {
    super({
      ...options,
      name: "period_counter",
    });

    this.dicDatas = {}
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("objectChange", this.onObjectChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.on("message", this.onMessage.bind(this));
  }



  /**
  * Is called when databases are connected and adapter received configuration.
  */
  async onReady() {
    await this.initialObjects()
    this.subscribeForeignObjects("*")
    cron.schedule("* * * * *", async () => {
      let date = new Date()
      for (let oneOD in this.dicDatas) {
        let oS = this.dicDatas[oneOD]

        await this._timePeriodFinished(oS, TimePeriods.Minute, date)
        if (date.getMinutes() == 0) {
          await this._timePeriodFinished(oS, TimePeriods.Hour, date)
          if (date.getHours() == 0) {
            await this._timePeriodFinished(oS, TimePeriods.Day, date)
            if (date.getDay() == 1) { //0 = Sunday
              await this._timePeriodFinished(oS, TimePeriods.Week, date)
            }
            if (date.getDate() == 1) {
              await this._timePeriodFinished(oS, TimePeriods.Month, date)
              if ((date.getMonth() % 3) == 0) {
                await this._timePeriodFinished(oS, TimePeriods.Quarter, date)
              }
              if (date.getMonth() == 0) {
                await this._timePeriodFinished(oS, TimePeriods.Year, date)
              }
            }
          }
        }
      }

    })
  }


  /**
  * Read CurrentValue as number
  * @param {ObjectSettings} oS
  * @returns {Promise<number>}
  */
  async _getCurrentValue(oS) {
    let currentState = await this.getForeignStateAsync(oS.id)
    if (currentState && currentState.val && Number(currentState.val) != Number.NaN) {
      return this._roundto(Number(currentState.val))
    }
    return 0
  }

  /**
  * create for every enabled object the needed stats and set it to initial it
  */
  async initialObjects() {
    this.log.info("inital all Objects")


    // delete all dics

    // read out all Objects
    let objects = await this.getForeignObjectsAsync("", "state", null)
    for (let idobject in objects) {
      let iobrokerObject = objects[idobject]
      await this._initialObject(objects[idobject])
    }
    this.log.info("initial completed")
  }
  /**
  * @param {ioBroker.Object | null | undefined} iobrokerObject
  * */
  async _initialObject(iobrokerObject) {

    if (iobrokerObject && iobrokerObject != undefined) {
      // only do something when enabled 
      if (iobrokerObject && iobrokerObject.common.custom && iobrokerObject.common.custom[this.namespace] && iobrokerObject.common.custom[this.namespace].enabled) {
        this.log.info("initial (enabled): " + iobrokerObject._id)
        /**@type {ObjectSettings} */
        var oS
        if (iobrokerObject._id in this.dicDatas) {
          oS = this.dicDatas[iobrokerObject._id]
          oS.updateSettings(iobrokerObject)

        } else {
          oS = new ObjectSettings(iobrokerObject, this.namespace)
          this.dicDatas[oS.id] = oS
        }


        await this._generateTreeStructure(oS)
        this.subscribeStates(oS.alias + "._startValues.*")
        let currentval = await this._getCurrentValue(oS)
        let startDay = await this._getStartValue(oS, TimePeriods.Day, currentval)
        if (oS.lastGoodValue == 0) {
          if (currentval < startDay) {
            oS.lastGoodValue = startDay
          }
          else {
            oS.lastGoodValue = currentval
          }
        }


        this.log.debug("subscribeForeignStates " + oS.id)
        await this.subscribeForeignStatesAsync(oS.id)
        oS.initialFinished = true
        await this._publishCurrentValue(oS, new Date(), currentval)


        this.log.debug("initial done " + iobrokerObject._id)
      } else {
        if (iobrokerObject._id in this.dicDatas) {
          this.log.info("disable : " + iobrokerObject._id)
          delete this.dicDatas[iobrokerObject._id];
          await this.unsubscribeForeignStatesAsync(iobrokerObject._id)

        }
      }
    }
  }


  /**
  * Is called if a subscribed object changes
  * @param {ObjectSettings} oS
  * @param {string} TimePeriod
  * @param {Date} date
  */
  async _timePeriodFinished(oS, TimePeriod, date) {
    if (oS.initialFinished) {
      this.log.debug(oS.alias + " TimePeriod " + TimePeriod + " end, insert now previous values ")
      await this._pushPreviousSates(oS, TimePeriod, date)
      this.log.debug(oS.alias + " set startValue from TimePeriod " + TimePeriod + " to " + oS.lastGoodValue)
      await this._setStartValue(oS, TimePeriod, oS.lastGoodValue)
      await this._calcCurrentTimePeriodValue(oS, date, oS.lastGoodValue, TimePeriod)
    }
  }

  /**
  * Is called if a subscribed object changes
  * @param {string} id
  * @param {ioBroker.Object | null | undefined} obj
  */
  async onObjectChange(id, obj) {
    this._initialObject(obj)
  }

  /**
  * Is called if a subscribed state changes
  * @param {string} id
  * @param {ioBroker.State | null | undefined} state
  */
  async onStateChange(id, state) {
    if (state) {
      if (id.startsWith(this.namespace)) {
        let idsplit = id.split(".")
        let idcounter = idsplit.slice(0, 3).join(".") + "._counterID"
        let idoS = await this.getStateAsync(idcounter)
        if (idoS) {
          let oS = this.dicDatas[idoS.val]
          if (oS) {
            await this._publishCurrentValue(oS, new Date(), await this._getCurrentValue(oS))

          }
        }

      }
      else {
        if (id in this.dicDatas) {
          await this._publishCurrentValue(this.dicDatas[id], new Date(state.ts), Number(state.val))
        }
        //this.log.debug(id + " state changed")
      }
    }

  }

  /**
  * Is called when adapter shuts down - callback has to be called under any circumstances!
  * @param {() => void} callback
  */
  onUnload(callback) {
    try {

      // Here you must clear all timeouts or intervals that may still be active
      // clearTimeout(timeout1);
      // clearTimeout(timeout2);
      // ...
      // clearInterval(interval1);

      callback();
    } catch (e) {
      callback();
    }
  }
  /**
  * Pull the before Values one level back
  * @param {ObjectSettings} oS
  * @param {string} TimePeriod
  * @param {Date} date
  */
  async _pushPreviousSates(oS, TimePeriod, date) {
    //Days before befüllen
    let iBeforeCount
    for (iBeforeCount = oS.beforeCount(TimePeriod); iBeforeCount > 1; iBeforeCount--) {
      let theValBefore = await this.getStateAsync(oS.alias + await this._getObjectIdPrevious(oS, TimePeriod, iBeforeCount - 1))
      let theObjectBefore = await this.getObjectAsync(oS.alias + await this._getObjectIdPrevious(oS, TimePeriod, iBeforeCount - 1))
      if (theValBefore && theObjectBefore) {
        await this._setStateAsync(oS.alias + await this._getObjectIdPrevious(oS, TimePeriod, iBeforeCount), Number(theValBefore.val), true)
        await this._setExtendObject(oS, await this._getObjectIdPrevious(oS, TimePeriod, iBeforeCount), theObjectBefore.common.name, "value.history." + TimePeriod, true, false, oS.output_unit, 'number')
      }
    }
    if (iBeforeCount == 1) {
      let current_timeper = this._roundto(this._roundto(oS.lastGoodValue - await this._getStartValue(oS, TimePeriod, oS.lastGoodValue)) * oS.output_multiplier)

      await this._setStateAsync(oS.alias + await this._getObjectIdPrevious(oS, TimePeriod, iBeforeCount), current_timeper, true)
      await this._setExtendObject(oS, await this._getObjectIdPrevious(oS, TimePeriod, iBeforeCount), await this._getDateTimeInfoForPrevious(oS, TimePeriod, date, 1), "value.history." + TimePeriod, true, false, oS.output_unit, 'number')

    }
  }




  /**
  * round to 10 
  * @param {Number} theNumber
  * @returns {Number}
  */
  _roundto(theNumber) {
    if (theNumber)
      return Number((theNumber).toFixed(10))
    else
      return 0
  }

  /**
  * Analyse for CounterReset and recalc current Timeperiods
  * @param {ObjectSettings} oS
  * @param {Date} date
  * @param {number} current_value
  */
  async _publishCurrentValue(oS, date, current_value) {
    if (oS.initialFinished) {

      current_value = this._roundto(current_value)

      if (oS.counterResetDetection && current_value < oS.lastGoodValue) {
        //Verringerung erkannt -> neuanpassung der startWerte
        if (Number.isNaN(oS.FirstWrongValue)) {
          oS.FirstWrongValue = current_value
          oS.counterResetDetetion_CurrentCountAfterReset = 0
        }
        if (oS.lastWrongValue != current_value) {
          oS.counterResetDetetion_CurrentCountAfterReset += 1
          oS.lastWrongValue = current_value
        }
        if (oS.counterResetDetetion_CurrentCountAfterReset < oS.counterResetDetetion_CountAfterReset) {
          return
        }

        var theAnpassung = this._roundto(oS.lastGoodValue - oS.FirstWrongValue)


        this.log.warn(oS.id + " wurde scheinbar resetet! Reset von " + oS.lastGoodValue + " nach " + current_value + " passe alle Startwerte an")
        oS.lastGoodValue = current_value
        oS.lastWrongValue = NaN
        oS.FirstWrongValue = NaN
        oS.counterResetDetetion_CurrentCountAfterReset = 0

        for (let TimePeriod in TimePeriods) {
          await this._setStartValue(oS, TimePeriod, (await this._getStartValue(oS, TimePeriod, current_value) - theAnpassung))
        }


      }
      oS.lastGoodValue = current_value
      for (let TimePeriod in TimePeriods) {
        await this._calcCurrentTimePeriodValue(oS, date, current_value, TimePeriod)
      }
    }


  }

  /**
  * Recalculate the Current and Detailed Values
  * @param {ObjectSettings} oS
  * @param {Date} date
  * @param {number} current_value
  * @param {string} TimePeriod
  */
  async _calcCurrentTimePeriodValue(oS, date, current_value, TimePeriod) {
    let current_timeperiod = this._roundto(this._roundto(current_value - await this._getStartValue(oS, TimePeriod, current_value)) * oS.output_multiplier)
    if (oS.beforeCount(TimePeriod) >= 0) {
      await this._setStateAsync(oS.alias + await this._getObjectIDCurrent(TimePeriod), current_timeperiod, true)
    }

    if (oS.detailed(TimePeriod) === true) {
      let id = oS.alias + await this._getAndCreateObjectIdDetailed(oS, TimePeriod, date)
      let val = current_timeperiod
      await this._setStateAsync(id, val, true)
    }

  }


  async _setStateAsync(id, state, ack) {
    await this.setStateAsync(id, state, ack)

  }




  /**
  * returns the KW of the date
  * @param {Date} date
  */
  _getKW(date) {
    // Copy date so don"t modify original
    let d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(d.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
      - 3 + (week1.getDay() + 6) % 7) / 7);

  }

  /**
* returns the KW of the date
* @param {Date} date
*/
  _getQuarter(date) {
    return Math.ceil((date.getMonth() + 1) / 3)

  }


  /**
  * create for every enabled object the needed current, history and before Datapoints
* @param {ObjectSettings} oS
 */
  async _generateTreeStructure(oS) {
    await this._setExtendChannel(oS, "", "CounterData for " + oS.id, true)
    await this._setExtendObject(oS, "._counterID", "ObjectID", "", true, false, null, "string")
    await this._setStateAsync(oS.alias + "._counterID", oS.id, true)
    await this._setExtendChannel(oS, "._startValues", "startValues for Timeperiods", true)



    for (let TimePeriod in TimePeriods) {
      if (oS.beforeCount(TimePeriod) >= 0) {
        await this._setExtendObject(oS, await this._getObjectIDCurrent(TimePeriod), "Current " + TimePeriod, "value.Current." + TimePeriod, true, false, oS.output_unit, 'number')
      }
      else {
        await this._setExtendObject(oS, await this._getObjectIDCurrent(TimePeriod), "Disabled", "value.Current.disabled", false, false, oS.output_unit, 'number')
      }
      //Before erzeugen bzw leeren
      let iBefore = 1
      for (iBefore = 1; iBefore <= oS.beforeCount(TimePeriod); iBefore++) {
        if (!await this.getObjectAsync(oS.alias + await this._getObjectIdPrevious(oS, TimePeriod, iBefore))) {
          await this._setExtendObject(oS, await this._getObjectIdPrevious(oS, TimePeriod, iBefore), "no data yet", "value.history." + TimePeriod, true, false, oS.output_unit, 'number')
        }
      }
      while (true) {
        let theObject = await this.getObjectAsync(oS.alias + await this._getObjectIdPrevious(oS, TimePeriod, iBefore))
        if (theObject) {
          await this._setExtendObject(oS, await this._getObjectIdPrevious(oS, TimePeriod, iBefore), theObject.common.name, "value.history.disabled", false, false, oS.output_unit, 'number')
          iBefore++
        }
        else { break }

      }

    }
  }

  /**
* Adds 0 to numbers
* @param {number} num
* @param {number} size
*/
  pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s
    return s
  }



  /**
* Extends an existing object or create it
* @param {ObjectSettings} oS
* @param {string} id
* @param {string} name
* @param {string} role
* @param {boolean} createIfnotExists
* @param {boolean} writeable
* @param {string | null} writeable
* @param {'number' | 'string' | 'boolean' | 'array' | 'object' | 'mixed' | 'file'} type

*/
  async _setExtendObject(oS, id, name, role, createIfnotExists, writeable, unit, type) {
    if (!name.includes(" (" + oS.alias + ")")) {
      name += " (" + oS.alias + ")"
    }
    let theObject = await this.getObjectAsync(oS.alias + id)
    if (theObject == null || theObject.common.name != name || theObject.common.role != role || theObject.common.unit != unit || theObject.common.write != writeable || theObject.common.type != type) {
      if (createIfnotExists || theObject != null)
        await this.extendObjectAsync(oS.alias + id, {
          type: "state",
          common: {
            name: name,
            role: role,
            type: type,
            desc: `Created by ${this.namespace}`,
            unit: unit,
            read: true,
            write: writeable,
          },
          native: {}
        })
    }

  }
  /**
   * Is called if a subscribed object changes
  * @param {ObjectSettings} oS
  * @param {string} id
  * @param {string} name
   * @param {boolean} createIfnotExists
   */
  async _setExtendChannel(oS, id, name, createIfnotExists) {
    if (!name.includes(" (" + oS.alias + ")")) {
      name += " (" + oS.alias + ")"
    }

    let theObject = await this.getObjectAsync(oS.alias + id)
    if (theObject == null || theObject == undefined || theObject.common.name != name || theObject.type != "channel") {
      if (createIfnotExists || theObject != null) {

        await this.extendObjectAsync(oS.alias + id, {
          type: "channel",
          common: {
            name: name,
            desc: `Created by ${this.namespace}`,
          },
          native: {}
        })
      }
    }

  }

  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} TimePeriod
* @param {number} beforeCounter
*/
  async _getObjectIdPrevious(oS, TimePeriod, beforeCounter) {
    if (oS.beforeCount(TimePeriod) > 0)
      await this._setExtendChannel(oS, "." + TimePeriodsZahl[TimePeriod] + "_previous" + TimePeriod + "s", TimePeriod + "s Before", true)
    else {
      await this._setExtendChannel(oS, "." + TimePeriodsZahl[TimePeriod] + "_previous" + TimePeriod + "s", "disabled", false)
    }



    let theID = "." + TimePeriodsZahl[TimePeriod] + "_previous" + TimePeriod + "s.Before_" + this.pad(beforeCounter, 2) + "_" + TimePeriod
    return theID

  }

  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} Timeperiod
* @param {Date} theDate
*/
  async _getDateTimeInfoForPrevious(oS, Timeperiod, theDate, beforeZähler) {

    let theDateInfo = ""
    if (Timeperiod == TimePeriods.Minute) {
      theDate.setMinutes(theDate.getMinutes() - beforeZähler)
      theDateInfo = theDate.toLocaleTimeString()
    } else if (Timeperiod == TimePeriods.Hour) {
      theDate.setHours(theDate.getHours() - beforeZähler)
      theDateInfo = theDate.toLocaleTimeString()

    } else if (Timeperiod == TimePeriods.Day) {
      theDate.setDate(theDate.getDate() - beforeZähler)
      theDateInfo = theDate.toDateString()
    } else if (Timeperiod == TimePeriods.Week) {
      theDate.setDate(theDate.getDate() - 7 * beforeZähler)
      theDateInfo = "KW_" + this._getKW(theDate)
    }
    else if (Timeperiod == TimePeriods.Month) {
      theDate.setMonth(theDate.getMonth() - beforeZähler)
      let MonthString = theDate.toLocaleString("en-us", { month: "long" })
      theDateInfo = this.pad(theDate.getMonth() + 1, 2) + "_" + MonthString
    }
    else if (Timeperiod == TimePeriods.Quarter) {
      theDate.setMonth(theDate.getMonth() - (beforeZähler * 3))

      theDateInfo = "quarter " + this._getQuarter(theDate)
    }

    else if (Timeperiod == TimePeriods.Year) {
      theDate.setFullYear(theDate.getFullYear() - beforeZähler)

      theDateInfo = theDate.getFullYear().toString()
    }
    return "Data from " + theDateInfo;
  }




  /**
* Creates the needed TreeStructure and returns the Id after alias-name
* @param {ObjectSettings} oS
* @param {string} TimePeriod
* @param {Date} date
*/
  async _getAndCreateObjectIdDetailed(oS, TimePeriod, date) {

    let IZusatz = "." + date.getFullYear()
    await this._setExtendChannel(oS, IZusatz, String(date.getFullYear()), true)

    if (TimePeriod == TimePeriods.Year) {
      IZusatz = IZusatz + "." + TimePeriodsZahl.Year + "_Year_" + date.getFullYear()
      await this._setExtendObject(oS, IZusatz, date.getFullYear() + " Value", "value.history." + TimePeriod, true, false, oS.output_unit, 'number')
      return IZusatz
    }

    IZusatz = IZusatz + "." + TimePeriodsZahl[TimePeriod] + "_" + TimePeriod + "s"
    await this._setExtendChannel(oS, IZusatz, TimePeriod + "s", true)

    if (TimePeriod == TimePeriods.Day) {
      let MonthString = date.toLocaleString("en-us", { month: "long" })
      IZusatz = IZusatz + "." + this.pad(date.getMonth() + 1, 2) + "_" + MonthString
      await this._setExtendChannel(oS, IZusatz, this.pad(date.getMonth() + 1, 2) + "_" + MonthString, true)
      IZusatz = IZusatz + "." + this.pad(date.getDate(), 2)
      await this._setExtendObject(oS, IZusatz, this.pad(date.getDate(), 2) + ". " + MonthString, "value.history." + TimePeriod, true, false, oS.output_unit, 'number')
    }
    if (TimePeriod == TimePeriods.Month) {
      let MonthString = date.toLocaleString("en-us", { month: "long" })
      IZusatz = IZusatz + "." + this.pad(date.getMonth() + 1, 2) + "_" + MonthString
      await this._setExtendObject(oS, IZusatz, this.pad(date.getMonth() + 1, 2) + "_" + MonthString, "value.history." + TimePeriod, true, false, oS.output_unit, 'number')
    }
    if (TimePeriod == TimePeriods.Week) {
      IZusatz = IZusatz + ".KW" + this.pad(this._getKW(date), 2)
      await this._setExtendObject(oS, IZusatz, "KW" + this.pad(this._getKW(date), 2), "value.history." + TimePeriod, true, false, oS.output_unit, 'number')
    }
    if (TimePeriod == TimePeriods.Quarter) {
      IZusatz = IZusatz + ".quater_" + this._getQuarter(date)
      await this._setExtendObject(oS, IZusatz, "quater_" + this._getQuarter(date), "value.history." + TimePeriod, true, false, oS.output_unit, 'number')
    }
    return IZusatz

  }

  /**
* returns the current DP
* @param {string} TimePeriod
*/
  async _getObjectIDCurrent(TimePeriod) {
    return "." + TimePeriodsZahl[TimePeriod] + "_current" + TimePeriod

  }




  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} TimePeriod
* @param {object} value
*/
  async _setStartValue(oS, TimePeriod, value) {
    await this._setStateAsync(oS.alias + await this._getStartID(TimePeriod), this._roundto(value), true)
  }
  /**
* Returns the startid
* @param {string} TimePeriod
*/
  async _getStartID(TimePeriod) {
    return "._startValues.start_" + TimePeriodsZahl[TimePeriod] + "_" + TimePeriod
  }
  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} TimePeriod
* @param {number} currentValue
* @returns {Promise<number>} 
*/
  async _getStartValue(oS, TimePeriod, currentValue) {
    //Create the DP if not exists
    let startID = await this._getStartID(TimePeriod)

    await this._setExtendObject(oS, startID, "start_" + TimePeriod, "", true, true, oS.iobrokerObject.common.unit, 'number')
    //set startData if not set
    let state = await this.getStateAsync(oS.alias + startID)
    if (!state || state.val == null || state.val == undefined) {
      await this._setStateAsync(oS.alias + startID, currentValue, true)
      return currentValue
    }
    else {
      return Number(state.val)
    }
  }


  /**
   * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
   * Using this method requires "common.message" property to be set to true in io-package.json
   * @param {ioBroker.Message} obj
   */
  onMessage(obj) {
    if (typeof obj === "object" && obj.message) {
      if (obj.command === "send") {
        // e.g. send email or pushover or whatever
        this.log.info("send command");

        // Send response in callback if required
        if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
      }
    }
  }
}


// @ts-ignore parent is a valid property on module
if (module.parent) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = (options) => new PeriodCounter(options);
} else {
  // otherwise start the instance directly
  new PeriodCounter();
}
