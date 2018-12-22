// @flow
/* eslint no-nested-ternary: "off" */

import { helpers } from "../../../../deion/worker/util";
import { PlayType, TeamNum } from "./types";

class PlayByPlayLogger {
    active: boolean;

    playByPlay: any[];

    scoringSummary: any[];

    twoPointConversionState: "attempting" | "converted" | void;

    quarter: string;

    constructor(active: boolean) {
        this.active = active;
        this.playByPlay = [];
        this.scoringSummary = [];
        this.quarter = "Q1";
    }

    updateTwoPointConversionState(td: boolean) {
        if (td && this.twoPointConversionState === "attempting") {
            this.twoPointConversionState = "converted";
        }
    }

    logEvent(
        type: PlayType,
        {
            clock,
            lost,
            made,
            names,
            quarter,
            safety,
            t,
            td,
            touchback,
            twoPointConversionTeam,
            yds,
        }: {
            clock: number,
            lost?: boolean,
            made?: boolean,
            names?: string[],
            quarter?: number,
            safety?: boolean,
            t?: TeamNum,
            td?: boolean,
            touchback?: boolean,
            twoPointConversionTeam?: number,
            yds?: number,
        } = {},
    ) {
        // This needs to run for scoring log, even when play-by-play logging is not active

        // Two point conversions are tricky because you can have multiple events occuring within them that could lead to scores, like if there is an interception and then a fumble. So in the most general case, it can't be assumed to be "failed" until we get another event after the two point conversion attempt.
        if (twoPointConversionTeam === undefined) {
            if (this.twoPointConversionState === "attempting") {
                const previousEvent = this.playByPlay[
                    this.playByPlay.length - 1
                ];
                if (previousEvent) {
                    const event = {
                        type: "text",
                        text: "Two point conversion failed!",
                        t: previousEvent.t,
                        time: previousEvent.time,
                        quarter: this.quarter,
                    };
                    this.playByPlay.push(event);
                    this.scoringSummary.push(event);
                }
            }
            this.twoPointConversionState = undefined;
        } else if (this.twoPointConversionState === undefined) {
            this.twoPointConversionState = "attempting";
        }

        // Handle touchdowns, 2 point conversions, and 2 point conversion returns by the defense
        let touchdownText = "a touchdown";
        if (twoPointConversionTeam !== undefined) {
            if (twoPointConversionTeam === t) {
                touchdownText = "a two point conversion";
            } else {
                touchdownText = "two points";
            }
        }

        let text;
        if (this.playByPlay !== undefined) {
            if (type === "injury") {
                text = `${names[0]} was injured!`;
            } else if (type === "quarter") {
                text = `Start of ${helpers.ordinal(quarter)} quarter`;
                this.quarter = `Q${quarter}`;
            } else if (type === "overtime") {
                text = "Start of overtime";
                this.quarter = "OT";
            } else if (type === "kickoff") {
                text = `${names[0]} kicked off${
                    touchback
                        ? " for a touchback"
                        : yds < 0
                        ? " into the end zone"
                        : ` to the ${yds} yard line`
                }`;
            } else if (type === "kickoffReturn") {
                text = `${names[0]} returned the kickoff ${yds} yards${
                    td ? " for a touchdown!" : ""
                }`;
            } else if (type === "punt") {
                text = `${names[0]} punted ${
                    touchback
                        ? "for a touchback"
                        : yds < 0
                        ? "into the end zone"
                        : `to the ${yds} yard line`
                }`;
            } else if (type === "puntReturn") {
                text = `${names[0]} returned the punt ${yds} yards${
                    td ? " for a touchdown!" : ""
                }`;
            } else if (type === "extraPoint") {
                text = `${names[0]} ${
                    made ? "made" : "missed"
                } the extra point`;
            } else if (type === "fieldGoal") {
                text = `${names[0]} ${
                    made ? "made" : "missed"
                } a ${yds} yard field goal`;
            } else if (type === "fumble") {
                text = `${names[0]} fumbled the ball!`;
            } else if (type === "fumbleRecovery") {
                if (safety || touchback) {
                    text = `${
                        names[0]
                    } recovered the fumble in the endzone, resulting in a ${
                        safety ? "safety!" : "touchback"
                    }`;
                } else if (lost) {
                    text = `${names[0]} recovered the fumble for the defense ${
                        td && yds < 1
                            ? `in the endzone for ${touchdownText}!`
                            : `and returned it ${yds} yards${
                                  td ? ` for ${touchdownText}!` : ""
                              }`
                    }`;
                    this.updateTwoPointConversionState(td);
                } else {
                    text = `${names[0]} recovered the fumble for the offense${
                        td
                            ? ` and carried it into the endzone for ${touchdownText}!`
                            : ""
                    }`;
                    this.updateTwoPointConversionState(td);
                }
            } else if (type === "interception") {
                text = `${
                    names[0]
                } intercepted the pass and returned it ${yds} yards${
                    td ? ` for ${touchdownText}!` : ""
                }`;
                this.updateTwoPointConversionState(td);
            } else if (type === "sack") {
                text = `${names[0]} was sacked by ${names[0]} for a ${
                    safety ? "safety!" : `${yds} yard loss`
                }`;
            } else if (type === "dropback") {
                text = `${names[0]} drops back to pass`;
            } else if (type === "passComplete") {
                if (safety) {
                    text = `${names[0]} completed a pass to ${
                        names[1]
                    } but he was tackled in the endzone for a safety!`;
                }
                text = `${names[0]} completed a pass to ${
                    names[1]
                } for ${yds} yards${td ? ` and ${touchdownText}!` : ""}`;
                this.updateTwoPointConversionState(td);
            } else if (type === "passIncomplete") {
                text = `Incomplete pass to ${names[1]} ${
                    yds > 1 ? `${yds} yards down the field` : "in the backfield"
                }`;
            } else if (type === "handoff") {
                text = `${names[0]} hands the ball off to ${names[1]}`;
            } else if (type === "run") {
                if (safety) {
                    text = `${
                        names[0]
                    } was tackled in the endzone for a safety!`;
                }
                text = `${names[0]} rushed for ${yds} yards${
                    td ? ` and ${touchdownText}!` : ""
                }`;
                this.updateTwoPointConversionState(td);
            }

            if (text) {
                let sec = Math.floor((clock % 1) * 60);
                if (sec < 10) {
                    sec = `0${sec}`;
                }
                const event = {
                    type: "text",
                    text,
                    t,
                    time: `${Math.floor(clock)}:${sec}`,
                    quarter: this.quarter,
                };

                this.playByPlay.push(event);

                if (
                    safety ||
                    td ||
                    type === "extraPoint" ||
                    (made && type === "fieldGoal")
                ) {
                    this.scoringSummary.push(event);
                }
            } else {
                throw new Error(`No text for "${type}"`);
            }
        }
    }

    logStat(qtr: number, t: number, pid: number, s: string, amt: number) {
        if (!this.active) {
            return;
        }

        this.playByPlay.push({
            type: "stat",
            qtr: this.team[t].stat.ptsQtrs.length - 1,
            t,
            pid,
            s,
            amt,
        });
    }

    getPlayByPlay(boxScore) {
        if (!this.active) {
            return;
        }

        return [
            {
                type: "init",
                boxScore,
            },
        ].concat(this.playByPlay);
    }
}

export default PlayByPlayLogger;
