namespace Evolution {

    /** Represent a day in the heatmap */
    interface HeatmapDay {
        /** Date of the day. */
        date: Date;

        /** The index of the week in the collection - 0 for the first week. */
        week: number;

        /** Index of the day of the week, going Sun = 0 and Sat = 6 */
        dayOfWeek: number;

        /** Culture invariant date formatted yyyy-mm-dd */
        dateString: string | null;

        /** Optional 'heat' total */
        total: number;

        /** Optional number of consecutive work days in streak */
        streak: number;

        /** Optional index of streak */
        streakIndex: number;
    }

    const foo1 = <div id="foo1" key="foo">
        <div key="a">A from 1</div>
        <div key="b">B from 1</div>
        <div key="c">C from 1</div>
        <button onclick={() => alert('Please do not press this again')} style={{ backgroundColor: 'red' }}>
            Press Me
    </button>
    </div>;

    const foo2 = <div>{foo1}</div>;

    export class CalendricalHeatmap extends Polymer.Element {
        static get is() { return 'calendrical-heatmap'; }
        static get properties() {
            return {
                start: { type: Date, value: null },
                end: { type: Date, value: null },
                daySize: { type: Number, value: 10 },
                gutterSize: { type: Number, value: 2 },
                description: { type: String, value: 'A summary of activity by calendar.' },
                totalText: { type: String, value: null },
                itemText: { type: String, value: '' },
                streak: { type: Number, value: 0, reflectToAttribute: true },
                streakBest: { type: Number, value: 0, reflectToAttribute: true },
                streakBestIndex: { type: Number, value: 0 },
                failStreak: { type: Boolean, value: false }
            };
        }

        daySize: number = 10;
        gutterSize: number = 2;

        totalText: string;
        streak: number = 0;
        streakBest: number = 0;
        description: 'A summary of activity by calendar.';
        holidays?: Set<string>;
        itemText: string = '';
        maxInDay: number = 0;
        failStreak: boolean = false;
        streakBestIndex: number = 0;

        constructor(public start?: Date | string | number | null, public end?: Date | string | number | null) {
            super();

            // Attach a shadow root to <fancy-tabs>.
            const shadowRoot = this.attachShadow({ mode: 'open' });
            shadowRoot.innerHTML = `<style>
    :host {
        display: inline-block;
        box-sizing: border-box;
        background-color: var(--content-background-colour);
        color: var(--content-foreground-colour);
        --label-font-size: 10px;
    }

    #calendricalHeatmapBody {
        margin: 8px 8px 0 8px;
    }

    svg.calendrical-heatmap {
    }

        svg.calendrical-heatmap rect.day {
            fill: var(--gutter-background-colour);
            box-sizing: border-box;
        }

            svg.calendrical-heatmap rect.day:hover {
                stroke: var(--highlight-colour, var(--main-colour));
                stroke-width: 2px;
                stroke-opacity: 1;
            }

            svg.calendrical-heatmap rect.day.heat-fail {
                fill: var(--heat-fail-colour, var(--error-colour));
                fill-opacity: .6;
            }

            svg.calendrical-heatmap rect.day.heat-1 {
                fill: var(--heat-colour, var(--accent-block-colour));
                fill-opacity: .2;
            }

            svg.calendrical-heatmap rect.day.heat-2 {
                fill: var(--heat-colour, var(--accent-block-colour));
                fill-opacity: .5;
            }

            svg.calendrical-heatmap rect.day.heat-3 {
                fill: var(--heat-colour, var(--accent-block-colour));
                fill-opacity: .8;
            }

            svg.calendrical-heatmap rect.day.heat-4 {
                fill: var(--heat-colour, var(--accent-block-colour));
            }

            svg.calendrical-heatmap rect.day.best-streak {
                stroke: var(--highlight-colour, var(--main-colour));
                stroke-width: 1px;
                stroke-opacity: .5;
            }


        svg.calendrical-heatmap text.day-label {
            font-size: var(--label-font-size);
            fill: var(--content-foreground-colour);
            fill-opacity: .8;
        }

        svg.calendrical-heatmap text.month-label {
            font-size: var(--label-font-size);
            fill: var(--content-foreground-colour);
            fill-opacity: .8;
        }

    #calendricalHeatmapFooter {
        font-size: var(--label-font-size);
        margin: 8px;
        overflow: hidden;
        height: 23px;
    }

    #legend {
        float: right;
        color: var(--content-foreground-colour);
        box-sizing: border-box;
        margin: .5em;
    }

    #legendKey {
        position: relative;
        bottom: -1px;
        display: inline-block;
        margin: 0 5px;
        list-style: none;
        box-sizing: border-box;
        padding: 0;
    }

        #legendKey > li {
            display: inline-block;
            width: 10px;
            height: 10px;
            box-sizing: border-box;
        }

            #legendKey > li.heat-fail {
                background-color: var(--heat-fail-colour, var(--error-colour));
                opacity: .6;
            }

            #legendKey > li.heat-0 {
                background-color: var(--gutter-background-colour);
            }

            #legendKey > li.heat-1 {
                background-color: var(--heat-colour, var(--accent-block-colour));
                opacity: .2;
            }

            #legendKey > li.heat-2 {
                background-color: var(--heat-colour, var(--accent-block-colour));
                opacity: .5;
            }

            #legendKey > li.heat-3 {
                background-color: var(--heat-colour, var(--accent-block-colour));
                opacity: .8;
            }

            #legendKey > li.heat-4 {
                background-color: var(--heat-colour, var(--accent-block-colour));
            }

    #summary {
        color: var(--content-foreground-colour);
        margin: .5em;
        float: left;
    }

    #calendricalHeatmapStreak {
        margin: .5em;
        display: none;
        float: left;
    }

    .streak-total {
        font-weight: bold;
    }

    #scaffold {
        height: 23px;
        --loading-progress-active-colour: var(--heat-colour, var(--accent-block-colour));
    }
</style>`;
        }

        /** Set default values for start and end if not set */
        private init(): { start: Date, end: Date } {
            const end = CalendricalHeatmap.getValidDate(this.end) || new Date();

            // If not set to a valid date start is 1 year ago
            const start = CalendricalHeatmap.getValidDate(this.start) || new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());

            this.end = end;
            this.start = start;

            return { start, end };
        }

        /** Parse the input and return a valid date or null
         * @param input input to parse
         * @returns Valid date or null */
        private static getValidDate(input: Date | string | number | null | undefined): Date | null {
            if (!input)
                return null;

            let val: Date | null = null;
            if (typeof input === 'string')
                val = new Date(input);
            else if (typeof input === 'number')
                val = new Date(input);
            else
                val = input;

            // We have a date but it ain't valid
            if (isNaN(val.getTime()))
                return null;

            return val;
        }

        /** Convert a date into a string that can be sorted and day-compared easily.
         * @param input The date to format.
         * @returns The date as a string formatted yyyy-mm-dd */
        private static toInvariantString(date: Date | string | number | null | undefined): string | null {
            date = CalendricalHeatmap.getValidDate(date);
            if (!date)
                return null;

            const yyyy = date.getFullYear();
            const mm = (date.getMonth() + 101).toString().substring(1); // 0-indexed month (0-11 rather than 1-12)
            const dd = (date.getDate() + 100).toString().substring(1); // Add 100 and skip first char to get leading '0''

            // Input expects yyyy-mm-dd
            return `${yyyy}-${mm}-${dd}`;
        }

        /** Convert a date into a localised string to show to users.
         * @param input The date to format.
         * @returns The date as a locale string. */
        private static toDisplayDate(date: Date) {
            return date.toLocaleDateString(navigator.language, { month: 'short', year: 'numeric', day: 'numeric' });
        }

        /** Highlight all the days that were part of the longest streak. */
        private highlightBest() {
            if (!this.shadowRoot)
                return;

            const inBestStreak = this.shadowRoot.querySelectorAll(`rect[data-streak-index='${this.streakBestIndex}']`);
            for (const rect of inBestStreak as any)
                // SVG elements have the CSS classlist on the element
                rect.classList.add('best-streak');
        }

        /** Remove the best-streak highlight, where present. */
        private highlightClear() {
            if (!this.shadowRoot)
                return;

            const inBestStreak = this.shadowRoot.querySelectorAll(`rect.best-streak`);
            for (const rect of inBestStreak as any)
                // SVG elements have the CSS classlist on the element
                rect.classList.remove('best-streak');
        }

        /** Render DOM for a day as an SVG <rect>
         * @param day The day properties to set.
         * @returns The SVG <rect> DOM element. */
        private displayDay(day: HeatmapDay): JSX.Element {
            // Calculate the heat as a proportion of the max
            let heatClass = '';
            if (day.total > 0 && this.maxInDay > 0) {
                if (day.total > this.maxInDay * .8)
                    heatClass = 'heat-4';
                else if (day.total > this.maxInDay * .5)
                    heatClass = 'heat-3';
                else if (day.total > this.maxInDay * .2)
                    heatClass = 'heat-2';
                else
                    heatClass = 'heat-1';
            }
            else if (this.failStreak && !this.isDayOff(day.date))
                // Showing fails explictly and not a holiday
                heatClass = 'heat-fail';

            // <rect class="day" width="10" height="10" x="11" y="0" fill="#ebedf0" data-count="0" data-date="2016-07-17"></rect>
            return <rect key={`day${day.dateString}`}
                className={`day ${heatClass}`}
                width={this.daySize}
                height={this.daySize}
                x={0}
                y={day.dayOfWeek * (this.daySize + this.gutterSize)}
                dataDayWeek={day.dayOfWeek}
                dataDate={day.dateString}
                dataCount={day.total}
                dataStreak={day.streak}
                dataStreakIndex={day.streakIndex}>{ 
                    day.total > 0 && <title>
                        {`${day.total.toLocaleString()} ${this.itemText} on ${CalendricalHeatmap.toDisplayDate(day.date)}`}
                    </title>
                }</rect>;
        }

        /** Render DOM for a week as an SVG <g> group with days as a column of <rect>
         * @param week The array or iterable holding the days in this week.
         * @param index The index of this week within the calendar panel.
         * @returns The SVG <g> DOM element. */
        private displayWeek(week: HeatmapDay[], index: number): JSX.Element {
            // <g transform="translate(week * 12, 0)">
            return <g key={`week${index}`}
                transform={`translate(${index * (this.daySize + this.gutterSize)}, 0)`}
                dataWeek={index}>
                {week.map(d => this.displayDay(d))}
            </g>;
        }

        /** Render DOM for a day label as an SVG <text>
         * @param name The name for the day.
         * @param index The index of the day 0-6.
         * @param hide Optional flag to add the text but hide it.
         * @returns The SVG <text> DOM element. */
        private displayDayLabel(name: string, index: number, hide = false): JSX.Element {
            //<text text-anchor="start" class="wday" dx="-14" dy="20">Mon</text>
            return <text key={`dayLabel${index}`}
                textAnchor="start"
                className="day-label"
                dx={-24}
                dy={8 + index * (this.daySize + this.gutterSize)}
                style={hide ? { display: 'none' } : null}>{name}</text>;
        }

        /** Render DOM for a month label as an SVG <text>
         * @param name The name for the month.
         * @param offset The offset in relative pixels from the start of the period.
         * @param key Unique key for the month
         * @returns The SVG <text> DOM element. */
        private displayMonthLabel(name: string, offset: number, key: string): JSX.Element {
            // <text x="589" y="-10" class="month">Jun</text>
            return <text key={`month${key}`}
                className="month-label"
                x={offset * (this.daySize + this.gutterSize)}
                y={-10}>{name}</text>;
        }

        /** Generate iteration of SVG <g> and <text> elements holding the weeks and month labels.
         * @param days The array or iterable holding all the days in the range.
         * @returns Iteration of SVG elements to render. */
        private *displayWeeks(days: HeatmapDay[]): IterableIterator<JSX.Element> {
            let weekBuffer: HeatmapDay[] = [];
            let weekIndex = 0;
            let currentMonth = 'none';
            for (const day of days) {
                // If the month name has changed yield a label offset by the current number of weeks
                const monthName = day.date.toLocaleDateString(navigator.language, { month: 'short' });
                if (currentMonth !== monthName) {
                    currentMonth = monthName;
                    yield this.displayMonthLabel(monthName, weekIndex, `${day.date.getFullYear()}-${day.date.getMonth()}`);
                }

                // If the day is in the current week add it to the buffer
                if (weekIndex === day.week)
                    weekBuffer.push(day);
                else {
                    // We're in a new week, render the current buffer and reset it
                    yield this.displayWeek(weekBuffer, weekIndex);

                    weekIndex++;
                    weekBuffer = [day];
                }
            }

            // Render whatever's left in the buffer
            yield this.displayWeek(weekBuffer, weekIndex);
        }

        /** Build an array of dates between the start and the end, including week numbers and a formatted string we can look up later. */
        private *buildDays(): IterableIterator<HeatmapDay> {
            const { start, end } = this.init();

            let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            let week = 0;
            while (current < end) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek === 0)
                    week++;

                const d: HeatmapDay = {
                    date: new Date(current.getTime()),
                    week,
                    dayOfWeek,
                    dateString: CalendricalHeatmap.toInvariantString(current),
                    total: 0,
                    streak: 0,
                    streakIndex: 0
                };

                yield d;

                // Add one day to the current date
                current.setDate(current.getDate() + 1);
            }
        }

        /** Render DOM for the calendar chart as an <svg> element.
         * @param days The array or iterable holding all the days in the range.
         * @returns The SVG <svg> DOM element. */
        private displayContent(days: HeatmapDay[], showStreak = false, failStreak = false, totalText:string = ''): JSX.Element {
            // Calc explicit width and height
            const width = 24 + (days[days.length - 1].week + 1) * (this.daySize + this.gutterSize); // Day label + no. weeks * day size
            const height = 20 + 7 * (this.daySize + this.gutterSize); // Month label + no. days * day size

            // Add the weeks to an offset wrapper so we have space for the legend
            const svgHeatmap = <svg width={width} height={height} className="calendrical-heatmap">
                <g transform={`translate(24, 20)`}>
                    {[...this.displayWeeks(days)]}
                    {this.displayDayLabel('Sun', 0, true)}
                    {this.displayDayLabel('Mon', 1)}
                    {this.displayDayLabel('Tue', 2)}
                    {this.displayDayLabel('Wed', 3)}
                    {this.displayDayLabel('Thu', 4)}
                    {this.displayDayLabel('Fri', 5)}
                    {this.displayDayLabel('Sat', 6, true)}
                </g>
            </svg>;

            const htmlContent = <div key="calendricalHeatmap">
                <div id="calendricalHeatmapBody">
                    {svgHeatmap}
                </div>
                <div id="calendricalHeatmapFooter">
                    <div id="summary">{totalText}</div>
                    {showStreak && <div id="calendricalHeatmapStreak" onmouseover={() => this.highlightBest()} onmouseout={() => this.highlightClear()}>
                        Current Streak: <span class="streak-total">{this.streak}</span> days, Best: <span class="streak-total">{this.streakBest}</span> days in a row.
                    </div>}
                    <div id="legend" title={this.description}>
                        Less
                        <ul id="legendKey">
                            {showStreak && failStreak && <li key="fail" class="heat-fail"></li>}
                            <li key="h0" class="heat-0"></li>
                            <li key="h1" class="heat-1"></li>
                            <li key="h2" class="heat-2"></li>
                            <li key="h3" class="heat-3"></li>
                            <li key="h4" class="heat-4"></li>
                        </ul>
                        More
                    </div>

                </div>
            </div>;

            const ele = htmlContent.render(this.shadowRoot);

            return htmlContent;
        }

        /** Get whether the date is an allowed day-off that doesn't break the streak.
         * @param date The date to check.
         * @returns true if the day can be missed without breaking the streak, false otherwise. */
        private isDayOff(date: Date): boolean {
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0)
                // Sunday
                return true;
            else if (dayOfWeek === 6)
                // Saturday
                return true;

            if (new Date().toDateString() === date.toDateString())
                // Today shouldn't break the streak
                return true;

            const keyDate = CalendricalHeatmap.toInvariantString(date);

            if (this.holidays && keyDate && this.holidays.has(keyDate))
                // Allowed holidays don't break the streak
                return true;

            return false;
        }

        /** Get the next date there must be activity on in order for the streak to be unbroken
         * @param date The current date in the streak.
         * @returns The next expected date in the streak. */
        private getNextStreakDate(date:Date): Date {
            if (date.getDay() === 5)
                // Current day is Friday, so next day for streak is the following Monday
                date.setDate(date.getDate() + 3);
            else
                date.setDate(date.getDate() + 1);

            // Skip days off
            while (this.isDayOff(date))
                date.setDate(date.getDate() + 1);

            return date;
        }






        /** Apply the data provided to the SVG to render the heat map.
         * @param {!object[]} heatMap The heat map data to set.
         * @param {boolean} [calculateStreak = false] Whether to calculate the streak as we build the map, default is false.
         * @param {boolean|null} [failStreak = null] Pass true or false to change the setting for failing streaks.
         * @param {Set|Array|null} [holidays = null] Pass holidays array. */
        setData(heatMap: HeatMapPoint[], calculateStreak = false, failStreak = null, holidays?: string[]|Set<string>) {
            if (failStreak || failStreak === false)
                this.failStreak = failStreak || false;

            if (holidays) {
                if (holidays instanceof Set)
                    this.holidays = new Set([...holidays].map(h => CalendricalHeatmap.toInvariantString(h)||''));

                else if (Array.isArray(holidays))
                    this.holidays = new Set(holidays.map(h => CalendricalHeatmap.toInvariantString(h) || ''));
            }

            this.maxInDay = Math.max(...heatMap.map(h => h.total));
            let total = 0;
            let nextDayForStreak = new Date(0);
            let currentStreak = 0, maxStreak = 0, streakIndex = 0, maxStreakIndex = 0;

            if (calculateStreak)
                // If calculating a streak then dates need to be oldest first, so sort the heat map
                // Dates are string format (yyyy-mm-dd) so string comparison will work
                heatMap.sort((a, b) => a.date.localeCompare(b.date));

            const days = [...this.buildDays()];

            for (const h of heatMap) {
                const day = days.find(d => d.dateString === h.date);
                if (!day)
                    continue;

                day.total = h.total;

                total += h.total;

                if (!calculateStreak)
                    continue;

                // For the streak to continue either this must be the next expected streak date,
                // or before it (so current date is weekend or other allowed skip)
                if (nextDayForStreak.toDateString() === day.date.toDateString() ||
                    nextDayForStreak > day.date) {
                    currentStreak++;

                    // If we're the new longest streak update the max vals
                    if (currentStreak > maxStreak) {
                        maxStreak = currentStreak;
                        maxStreakIndex = streakIndex;
                    }
                }
                else {
                    currentStreak = 1;
                    streakIndex++;
                }

                day.streak = currentStreak;
                day.streakIndex = streakIndex;

                nextDayForStreak = this.getNextStreakDate(day.date);
            }

            if (calculateStreak) {
                // Is today the next streak date? If not then we're currently on a break.
                const today = new Date();
                if (!(nextDayForStreak.toDateString() === today.toDateString() ||
                    nextDayForStreak > today))
                    currentStreak = 0;

                this.streak = currentStreak;
                this.streakBest = maxStreak;
                this.streakBestIndex = maxStreakIndex;
            }

            const s = CalendricalHeatmap.getValidDate(this.start);
            let totalText = `${total.toLocaleString()} ${this.itemText}`;
            if (s)
                totalText = `${total.toLocaleString()} ${this.itemText} since ${CalendricalHeatmap.toDisplayDate(s)}`;

            this.displayContent(days, calculateStreak, this.failStreak, totalText);
        }

        ready() {
            super.ready();

            const days = [...this.buildDays()];
            this.displayContent(days);
        }
    }

    customElements.define(CalendricalHeatmap.is, CalendricalHeatmap);
}