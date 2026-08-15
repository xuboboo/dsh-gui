window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-settings-token-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_web_react = require("@deepseek-ai/dsh-client-web-react");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		/** localStorage key holding the stats start marker (ms epoch, or absent for full history). */
		const RESET_KEY = "dsh.usage.resetAt";
		/** Read the persisted stats start marker; storage failures degrade to full history. */
		function readResetAt() {
			try {
				const raw = localStorage.getItem(RESET_KEY);
				if (raw === null) return null;
				const value = Number(raw);
				return Number.isFinite(value) && value > 0 ? value : null;
			} catch {
				return null;
			}
		}
		/** Persist (or clear) the stats start marker; storage failures are silent no-ops. */
		function writeResetAt(value) {
			try {
				if (value === null) localStorage.removeItem(RESET_KEY);
				else localStorage.setItem(RESET_KEY, String(value));
			} catch {}
		}
		const ZERO = {
			uncachedInputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0
		};
		function numberOr(value, fallback = 0) {
			return typeof value === "number" && Number.isFinite(value) ? value : fallback;
		}
		/**
		* Read the session row's tokenUsage projection value. The projection column
		* serves the flat bucket shape; a defensive branch also accepts the persisted
		* cache's folded `{ totals, last }` state shape should a deployment ever
		* surface it on the wire.
		* @param summary - one session.list row.
		* @returns the four buckets, zero-filled.
		*/
		function usageOf(summary) {
			const value = (summary.projections?.values)?.tokenUsage;
			if (value === void 0 || value === null || typeof value !== "object") return ZERO;
			const record = value;
			const totals = record.totals;
			if (totals !== void 0 && typeof totals === "object") return {
				uncachedInputTokens: numberOr(totals.uncachedInputTokens),
				outputTokens: numberOr(totals.outputTokens),
				cacheReadTokens: numberOr(totals.cacheReadTokens),
				cacheWriteTokens: numberOr(totals.cacheWriteTokens)
			};
			return {
				uncachedInputTokens: numberOr(record.uncachedInputTokens),
				outputTokens: numberOr(record.outputTokens),
				cacheReadTokens: numberOr(record.cacheReadTokens),
				cacheWriteTokens: numberOr(record.cacheWriteTokens)
			};
		}
		/** Session-level stats projection value (turns / timings), zero-filled. */
		function statsOf(summary) {
			const value = (summary.projections?.values)?.sessionStats;
			if (value === void 0 || value === null || typeof value !== "object") return {
				turns: 0,
				llmMs: 0,
				decodeTokens: 0
			};
			const record = value;
			return {
				turns: numberOr(record.turns),
				llmMs: numberOr(record.llmMs),
				decodeTokens: numberOr(record.decodeTokens)
			};
		}
		/** Title projection value, when one exists. */
		function titleOf(summary) {
			const value = (summary.projections?.values)?.title;
			return typeof value === "string" && value.length > 0 ? value : void 0;
		}
		/** Local calendar day key for a timestamp. */
		function dayKey(time) {
			const date = new Date(time);
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return `${date.getFullYear()}-${month}-${day}`;
		}
		/** Aggregate one session.list payload into the statistics view. */
		function aggregate(items, resetAt = null) {
			const totals = {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				sessions: 0
			};
			let llmMs = 0;
			let decodeTokens = 0;
			let turns = 0;
			const byDayMap = /* @__PURE__ */ new Map();
			const rows = [];
			for (const summary of items) {
				if (summary.blank) continue;
				if (resetAt !== null && summary.updatedAt < resetAt) continue;
				const usage = usageOf(summary);
				const stats = statsOf(summary);
				const total = usage.uncachedInputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
				if (total > 0) {
					totals.input += usage.uncachedInputTokens;
					totals.output += usage.outputTokens;
					totals.cacheRead += usage.cacheReadTokens;
					totals.cacheWrite += usage.cacheWriteTokens;
					totals.sessions += 1;
				}
				llmMs += stats.llmMs;
				decodeTokens += stats.decodeTokens;
				turns += stats.turns;
				const key = dayKey(summary.updatedAt);
				const bucket = byDayMap.get(key);
				if (bucket === void 0) byDayMap.set(key, {
					day: key,
					input: usage.uncachedInputTokens,
					output: usage.outputTokens,
					cacheRead: usage.cacheReadTokens,
					cacheWrite: usage.cacheWriteTokens,
					sessions: total > 0 ? 1 : 0
				});
				else {
					bucket.input += usage.uncachedInputTokens;
					bucket.output += usage.outputTokens;
					bucket.cacheRead += usage.cacheReadTokens;
					bucket.cacheWrite += usage.cacheWriteTokens;
					if (total > 0) bucket.sessions += 1;
				}
				rows.push({
					sessionId: summary.sessionId,
					title: titleOf(summary),
					updatedAt: summary.updatedAt,
					input: usage.uncachedInputTokens,
					output: usage.outputTokens,
					cacheRead: usage.cacheReadTokens,
					cacheWrite: usage.cacheWriteTokens,
					turns: stats.turns,
					llmMs: stats.llmMs
				});
			}
			const byDay = [];
			const now = Date.now();
			for (let offset = 29; offset >= 0; offset -= 1) {
				const key = dayKey(now - offset * 864e5);
				byDay.push(byDayMap.get(key) ?? {
					day: key,
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					sessions: 0
				});
			}
			const topSessions = rows.sort((a, b) => b.input + b.output + b.cacheRead + b.cacheWrite - (a.input + a.output + a.cacheRead + a.cacheWrite)).slice(0, 50);
			return {
				totals,
				llmMs,
				decodeTokens,
				turns,
				byDay,
				topSessions
			};
		}
		/** Human text for a rejected wire call. */
		function messageOf(error) {
			if (error instanceof Error) return error.message;
			return String(error);
		}
		/** Token usage statistics page store. */
		var UsageStatsStore = class {
			api;
			/** The snapshot the section renders from (uSES-safe store). */
			store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({
				status: "idle",
				error: null,
				stats: null,
				refreshedAt: null,
				resetAt: readResetAt()
			});
			/** Latest load wins; an older response never overwrites a newer one. */
			generation = 0;
			/**
			* @param api - the wire face (sessions domain).
			*/
			constructor(api) {
				this.api = api;
			}
			/**
			* Refresh the whole page snapshot from `session.list`. A failure keeps the
			* last good stats and surfaces the error.
			* @returns nothing; the snapshot carries the outcome.
			*/
			async load() {
				const generation = ++this.generation;
				this.store.update((state) => {
					state.status = "loading";
					state.error = null;
				});
				try {
					const response = await this.api.sessions.list({});
					if (!response.result.ok) throw new Error(response.result.error.message);
					const stats = aggregate(response.result.value.items, readResetAt());
					if (generation !== this.generation) return;
					this.store.update((state) => {
						state.status = "ready";
						state.stats = stats;
						state.resetAt = readResetAt();
						state.refreshedAt = Date.now();
					});
				} catch (error) {
					if (generation !== this.generation) return;
					this.store.update((state) => {
						state.status = "error";
						state.error = messageOf(error);
					});
				}
			}
		};
		/**
		* Refetch the page snapshot only after its first load: an unopened Usage
		* page must not fetch on background invalidations.
		* @param controller - the page store.
		*/
		function refreshIfLoaded(controller) {
			if (controller.store.getSnapshot().status === "idle") return;
			controller.load();
		}
		/**
		* Clear the stats: mark "now" as the aggregation start. Sessions keep their
		* records; only the usage view resets. Reversible via {@link restoreStats}.
		* @param controller - the page store.
		*/
		function clearStats(controller) {
			writeResetAt(Date.now());
			controller.load();
		}
		/**
		* Restore the full history view by removing the stats start marker.
		* @param controller - the page store.
		*/
		function restoreStats(controller) {
			writeResetAt(null);
			controller.load();
		}
		//#endregion
		//#region src/client/UsageSection.tsx
		/**
		* Token usage statistics settings section: summary cards, a trailing daily
		* bar chart (pure CSS, no chart library), and a top-sessions table — all
		* aggregated from the session.list projection column.
		*/
		/** Format a token count compactly (1.2k / 3.4M). */
		function formatTokens(value) {
			if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
			if (value >= 1e4) return Math.round(value / 1e3) + "k";
			if (value >= 1e3) return (value / 1e3).toFixed(1) + "k";
			return String(value);
		}
		/** Format a duration compactly. */
		function formatDuration(ms) {
			if (ms < 1e3) return ms + " ms";
			if (ms < 6e4) return (ms / 1e3).toFixed(1) + " s";
			return Math.round(ms / 6e4) + " min";
		}
		/** MM-DD view of an ISO day key. */
		function dayLabel(day) {
			return day.slice(5);
		}
		/** YYYY-MM-DD view of an epoch-ms timestamp (local time). */
		function dateLabel(time) {
			const date = new Date(time);
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return `${date.getFullYear()}-${month}-${day}`;
		}
		/** Summary card row. */
		function Card({ label, value, hint }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					flex: "1 1 120px",
					minWidth: 120,
					padding: "10px 12px",
					borderRadius: 8,
					border: "1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))",
					background: "var(--dsw-static-surface-raised, rgba(127,140,175,0.08))"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						opacity: .65
					},
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 17,
						fontWeight: 600,
						marginTop: 2
					},
					title: hint,
					children: value
				})]
			});
		}
		/** One day column in the stacked bar chart. */
		function DayBar({ bucket, index, max, showLabel }) {
			const inputHeight = max > 0 ? Math.max(bucket.input / max * 100, bucket.input > 0 ? 2 : 0) : 0;
			const outputHeight = max > 0 ? Math.max(bucket.output / max * 100, bucket.output > 0 ? 2 : 0) : 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					flex: "1 1 0",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 4
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						height: 96,
						width: "100%",
						maxWidth: 22,
						display: "flex",
						flexDirection: "column-reverse",
						justifyContent: "flex-start",
						background: "var(--dsw-static-surface-raised, rgba(127,140,175,0.06))",
						borderRadius: 4,
						overflow: "hidden",
						position: "relative"
					},
					title: `${bucket.day} — ${formatTokens(bucket.input)} in / ${formatTokens(bucket.output)} out`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						height: outputHeight + "%",
						background: "var(--dsw-static-deepseek-400, #7e8ffe)",
						opacity: .92
					} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						height: inputHeight + "%",
						background: "var(--dsw-static-deepseek-600, #3750dc)"
					} })]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 10,
						opacity: showLabel ? .8 : .25
					},
					children: dayLabel(bucket.day)
				})]
			});
		}
		/** Top-sessions table row. */
		function SessionRow({ row }) {
			const total = row.input + row.output + row.cacheRead + row.cacheWrite;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					style: {
						padding: "6px 8px",
						maxWidth: 260,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap"
					},
					title: row.title,
					children: row.title ?? row.sessionId.slice(0, 8)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					style: {
						padding: "6px 8px",
						whiteSpace: "nowrap",
						opacity: .7
					},
					children: dayLabel(new Date(row.updatedAt).toISOString().slice(0, 10))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					style: {
						padding: "6px 8px",
						textAlign: "right"
					},
					children: formatTokens(row.input)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					style: {
						padding: "6px 8px",
						textAlign: "right"
					},
					children: formatTokens(row.output)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					style: {
						padding: "6px 8px",
						textAlign: "right",
						opacity: .75
					},
					children: formatTokens(row.cacheRead + row.cacheWrite)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					style: {
						padding: "6px 8px",
						textAlign: "right",
						fontWeight: 600
					},
					children: formatTokens(total)
				})
			] });
		}
		/**
		* The settings section body. Loads once on mount; the Refresh button and the
		* connection-reset invalidation refetch after the first load.
		*/
		function UsageSection({ controller, useSnapshot, t }) {
			const snapshot = useSnapshot((state) => state);
			const [rangeDays, setRangeDays] = (0, react.useState)(7);
			const [confirmOpen, setConfirmOpen] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				controller.load();
			}, [controller]);
			const stats = snapshot.stats;
			const visibleDays = (0, react.useMemo)(() => {
				if (stats === null) return [];
				return stats.byDay.slice(30 - rangeDays);
			}, [stats, rangeDays]);
			const maxDaily = (0, react.useMemo)(() => {
				let max = 0;
				for (const bucket of visibleDays) {
					const total = bucket.input + bucket.output;
					if (total > max) max = total;
				}
				return max;
			}, [visibleDays]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 18,
					padding: "4px 2px 12px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							flexWrap: "wrap"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 14,
								opacity: .75
							},
							children: t("intro")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center"
							},
							children: [
								snapshot.resetAt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										opacity: .7
									},
									children: t("statsSince").replace("{date}", dateLabel(snapshot.resetAt))
								}),
								snapshot.resetAt !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									onClick: () => {
										restoreStats(controller);
									},
									disabled: snapshot.status === "loading",
									children: t("restoreStats")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									onClick: () => {
										setConfirmOpen(true);
									},
									disabled: snapshot.status === "loading",
									children: t("clearStats")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									onClick: () => {
										controller.load();
									},
									disabled: snapshot.status === "loading",
									children: t("refresh")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: confirmOpen,
						onClose: () => {
							setConfirmOpen(false);
						},
						title: t("clearConfirmTitle"),
						closeLabel: t("cancel"),
						description: t("clearConfirmBody"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "flex-end",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								onClick: () => {
									setConfirmOpen(false);
								},
								children: t("cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								onClick: () => {
									setConfirmOpen(false);
									clearStats(controller);
								},
								children: t("clearConfirm")
							})]
						})
					}),
					snapshot.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "10px 12px",
							borderRadius: 8,
							border: "1px solid var(--dsw-static-danger-500, rgba(224,86,86,0.4))",
							color: "var(--dsw-static-danger-500, #e05656)",
							fontSize: 13
						},
						children: [
							t("loadFailed"),
							": ",
							snapshot.error
						]
					}),
					stats === null && snapshot.status !== "error" && snapshot.status !== "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "26px 12px",
							textAlign: "center",
							opacity: .6,
							fontSize: 13
						},
						children: t("noData")
					}),
					stats !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 10,
								flexWrap: "wrap"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
									label: t("totalTokens"),
									value: formatTokens(stats.totals.input + stats.totals.output),
									hint: `in ${formatTokens(stats.totals.input)} + out ${formatTokens(stats.totals.output)}`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
									label: t("inputTokens"),
									value: formatTokens(stats.totals.input)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
									label: t("outputTokens"),
									value: formatTokens(stats.totals.output)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
									label: t("cacheTokens"),
									value: formatTokens(stats.totals.cacheRead + stats.totals.cacheWrite),
									hint: `read ${formatTokens(stats.totals.cacheRead)} / write ${formatTokens(stats.totals.cacheWrite)}`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
									label: t("sessions"),
									value: String(stats.totals.sessions)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
									label: t("llmTime"),
									value: formatDuration(stats.llmMs)
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								padding: "12px 14px",
								borderRadius: 8,
								border: "1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: 10,
									flexWrap: "wrap",
									gap: 8
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 13,
										fontWeight: 600
									},
									children: t("daily")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										gap: 6
									},
									children: [7, 30].map((days) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: rangeDays === days ? "primary" : "ghost",
										onClick: () => {
											setRangeDays(days);
										},
										children: days === 7 ? t("range7") : t("range30")
									}, days))
								})]
							}), maxDaily === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									padding: "18px 0",
									textAlign: "center",
									opacity: .55,
									fontSize: 13
								},
								children: t("noData")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									gap: 3,
									alignItems: "flex-end"
								},
								children: visibleDays.map((bucket, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DayBar, {
									bucket,
									index,
									max: maxDaily,
									showLabel: index % 5 === 0 || index === visibleDays.length - 1
								}, bucket.day))
							})]
						}),
						stats.topSessions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								padding: "12px 14px",
								borderRadius: 8,
								border: "1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 13,
									fontWeight: 600,
									marginBottom: 8
								},
								children: t("topSessions")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { overflowX: "auto" },
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
									style: {
										width: "100%",
										borderCollapse: "collapse",
										fontSize: 12.5
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
										style: { opacity: .65 },
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												style: {
													textAlign: "left",
													padding: "4px 8px",
													fontWeight: 500
												},
												children: t("session")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												style: {
													textAlign: "left",
													padding: "4px 8px",
													fontWeight: 500
												},
												children: t("updated")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												style: {
													textAlign: "right",
													padding: "4px 8px",
													fontWeight: 500
												},
												children: t("inputTokens")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												style: {
													textAlign: "right",
													padding: "4px 8px",
													fontWeight: 500
												},
												children: t("outputTokens")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												style: {
													textAlign: "right",
													padding: "4px 8px",
													fontWeight: 500
												},
												children: t("cacheTokens")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												style: {
													textAlign: "right",
													padding: "4px 8px",
													fontWeight: 500
												},
												children: t("total")
											})
										]
									}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: stats.topSessions.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, { row }, row.sessionId)) })]
								})
							})]
						})
					] })
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Copy dictionaries for the Token usage statistics settings section. */
		/** English strings (the key-set source of truth for this pair). */
		const en = {
			nav: "Usage",
			title: "Token usage",
			intro: "Provider-reported token usage aggregated across all local sessions.",
			refresh: "Refresh",
			totalTokens: "Total tokens",
			inputTokens: "Input",
			outputTokens: "Output",
			cacheTokens: "Cache",
			cacheRead: "Cache read",
			cacheWrite: "Cache write",
			sessions: "Sessions",
			llmTime: "LLM time",
			decodeTokens: "Decoded tokens",
			daily: "Daily usage",
			range7: "Last 7 days",
			range30: "Last 30 days",
			topSessions: "Top sessions by usage",
			session: "Session",
			updated: "Last activity",
			total: "Total",
			turns: "Turns",
			noData: "No usage data yet. Start a conversation and provider-reported usage will show up here.",
			loadFailed: "Loading usage statistics failed",
			retry: "Retry",
			clearStats: "Clear stats",
			restoreStats: "Restore full stats",
			clearConfirmTitle: "Clear usage stats?",
			clearConfirmBody: "Only usage after this moment will be counted. No sessions are deleted, and full stats can be restored anytime.",
			clearConfirm: "Clear",
			cancel: "Cancel",
			statsSince: "Counting since {date}"
		};
		/** Simplified Chinese strings, paired with {@link en} key-for-key. */
		const zh = {
			nav: "用量统计",
			title: "Token 用量统计",
			intro: "基于本机全部会话的提供商上报用量汇总（输入 / 输出 / 缓存 Token）。",
			refresh: "刷新",
			totalTokens: "总 Token",
			inputTokens: "输入",
			outputTokens: "输出",
			cacheTokens: "缓存",
			cacheRead: "缓存读取",
			cacheWrite: "缓存写入",
			sessions: "会话数",
			llmTime: "LLM 耗时",
			decodeTokens: "解码 Token",
			daily: "每日用量",
			range7: "近 7 天",
			range30: "近 30 天",
			topSessions: "会话用量排行",
			session: "会话",
			updated: "最近活动",
			total: "合计",
			turns: "轮次",
			noData: "暂无用量数据。开始对话后，这里会展示 Token 使用统计。",
			loadFailed: "加载用量统计失败",
			retry: "重试",
			clearStats: "清空统计",
			restoreStats: "恢复完整统计",
			clearConfirmTitle: "清空用量统计？",
			clearConfirmBody: "清空后只统计此刻之后的会话用量，不会删除任何会话记录，可随时恢复完整统计。",
			clearConfirm: "清空",
			cancel: "取消",
			statsSince: "统计自 {date} 起"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.usage";
		/**
		* Required services (cordis fiber inject). The target slot is declared by
		* ui-settings' apply, whose activation order relative to this one is NOT
		* constrained; registration depends on each slot through `slots.inject()`.
		*/
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote"
		];
		/**
		* Register the Usage section once the `settings.section` declaration is on
		* the ledger, wire its store to the connection, and refetch on connection
		* resets once the page has loaded.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-settings-token-usage: copy dictionaries");
			const connection = ctx.get("connection");
			const controller = new UsageStatsStore(connection.api);
			const useSnapshot = (0, _deepseek_ai_dsh_client_web_react.bindSnapshotSelector)(controller.store);
			const t = ctx.locale.bind(NS);
			const injected = () => ({
				controller,
				useSnapshot,
				api: connection.api,
				t
			});
			ctx.effect(() => {
				const refresh = () => {
					refreshIfLoaded(controller);
				};
				const disposers = [ctx.on("connection/reset", refresh)];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "ui-settings-token-usage: pushed invalidations");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "usage",
				order: 30,
				label: () => t("nav"),
				inject: injected
			}, UsageSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map