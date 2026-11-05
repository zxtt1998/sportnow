import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { players, teams } from "../../data/entities";
import { EntityAvatar } from "../../components/news/FollowStrip";
import { useUser } from "../../stores/UserStore";
import { normalize } from "../../services/news";
export function FollowManager() {
  const { data, toggleFollow } = useUser();
  const [query, setQuery] = useState("");
  const entities = [...teams, ...players].filter((e) =>
    normalize(`${e.name} ${e.englishName} ${e.shortName}`).includes(
      normalize(query),
    ),
  );
  return (
    <section>
      <div className="panel-heading">
        <h2>我的关注</h2>
        <span>{data.follows.length} 个主场</span>
      </div>
      <p className="panel-description">
        选择热爱的球队与球员，推荐会跟随你的选择。
      </p>
      <div className="search-field small-search">
        <Search size={18} />
        <input
          type="search"
          aria-label="搜索关注对象"
          placeholder="查找球队或球员"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {[
        {
          title: "NBA 球队",
          values: entities.filter(
            (e) => e.sport === "nba" && teams.some((t) => t.id === e.id),
          ),
        },
        {
          title: "足球俱乐部",
          values: entities.filter(
            (e) => e.sport === "football" && teams.some((t) => t.id === e.id),
          ),
        },
        {
          title: "球员",
          values: entities.filter((e) => players.some((p) => p.id === e.id)),
        },
      ].map(
        (group) =>
          group.values.length > 0 && (
            <div className="follow-group" key={group.title}>
              <h3>{group.title}</h3>
              <div className="follow-manager-list">
                {group.values.map((e) => {
                  const followed = data.follows.some((f) => f.id === e.id);
                  return (
                    <div className="follow-manager-row" key={e.id}>
                      <EntityAvatar id={e.id} />
                      <span>
                        <strong>{e.name}</strong>
                        <small lang="en">{e.englishName}</small>
                      </span>
                      <button
                        className={`follow-toggle ${followed ? "followed" : ""}`}
                        aria-pressed={followed}
                        aria-label={`${followed ? "取消关注" : "关注"}${e.name}`}
                        onClick={() => toggleFollow(e.id)}
                      >
                        {followed ? <Check size={15} /> : <Plus size={15} />}
                        <span>{followed ? "已关注" : "关注"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ),
      )}
      {entities.length === 0 && (
        <p className="inline-empty">没有找到，试试球队简称或英文名。</p>
      )}
    </section>
  );
}
