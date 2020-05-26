import PropTypes from "prop-types";
import React from "react";
import useTitleBar from "../hooks/useTitleBar";
import { getCols, helpers } from "../util";
import { DataTable, PlayerNameLabels } from "../components";
import type { View } from "../../common/types";

const Most = ({
	description,
	extraCols,
	players,
	stats,
	title,
	type,
	userTid,
}: View<"most">) => {
	useTitleBar({ title });

	const superCols = [
		{
			title: "",
			colspan: 7 + extraCols.length,
		},
		{
			title: "Best Season",
			colspan: 2 + stats.length,
		},
		{
			title: "Career Stats",
			colspan: stats.length,
		},
	];

	const cols = getCols(
		"#",
		"Name",
		...extraCols.map(x => x.colName),
		"Pos",
		"Drafted",
		"Retired",
		"Pick",
		"Peak Ovr",
		"Year",
		"Team",
		...stats.map(stat => `stat:${stat}`),
		...stats.map(stat => `stat:${stat}`),
	);
	console.log(players);

	const rows = players.map(p => {
		return {
			key: p.pid,
			data: [
				p.rank,
				<PlayerNameLabels pid={p.pid}>{p.name}</PlayerNameLabels>,
				...extraCols.map(x =>
					typeof x.key === "string" ? p[x.key] : p[x.key[0]][x.key[1]],
				),
				p.ratings[p.ratings.length - 1].pos,
				p.draft.year,
				p.retiredYear === Infinity ? null : p.retiredYear,
				p.draft.round > 0 ? `${p.draft.round}-${p.draft.pick}` : "",
				p.peakOvr,
				p.bestStats.season,
				<a
					href={helpers.leagueUrl([
						"roster",
						p.bestStats.abbrev,
						p.bestStats.season,
					])}
				>
					{p.bestStats.abbrev}
				</a>,
				...stats.map(stat => helpers.roundStat(p.bestStats[stat], stat)),
				...stats.map(stat => helpers.roundStat(p.careerStats[stat], stat)),
			],
			classNames: {
				"table-danger": p.hof,
				"table-success": p.retiredYear === Infinity,
				"table-info": p.statsTids
					.slice(0, p.statsTids.length - 1)
					.includes(userTid),
			},
		};
	});

	return (
		<>
			<p>{description}</p>

			<p>
				Players who have played for your team are{" "}
				<span className="text-info">highlighted in blue</span>. Active players
				are <span className="text-success">highlighted in green</span>. Hall of
				Famers are <span className="text-danger">highlighted in red</span>.
			</p>

			<DataTable
				cols={cols}
				defaultSort={[0, "asc"]}
				name={`Most_${type}`}
				rows={rows}
				superCols={superCols}
			/>
		</>
	);
};

Most.propTypes = {
	players: PropTypes.arrayOf(PropTypes.object).isRequired,
	stats: PropTypes.arrayOf(PropTypes.string).isRequired,
	userTid: PropTypes.number.isRequired,
};

export default Most;