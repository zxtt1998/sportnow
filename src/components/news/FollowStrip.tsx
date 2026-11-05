import { ArrowRight, Plus, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "../../stores/UserStore";
import { getEntity } from "../../data/entities";
export function EntityAvatar({
  id,
  small = false,
}: {
  id: string;
  small?: boolean;
}) {
  const entity = getEntity(id);
  return (
    <span
      className={`entity-avatar ${small ? "small" : ""} avatar-${id}`}
      style={{ "--entity-color": entity?.color } as React.CSSProperties}
    >
      {id === "spurs" ? (
        <Star size={small ? 19 : 24} strokeWidth={1.7} />
      ) : id === "madrid" ? (
        <span className="madrid-monogram">M</span>
      ) : id === "ronaldo" ? (
        <span className="cr-monogram">7</span>
      ) : (
        <span>{entity?.shortName.slice(0, 2)}</span>
      )}
    </span>
  );
}
export function FollowStrip() {
  const { data } = useUser();
  return (
    <section className="follow-section">
      <div className="section-title small-title">
        <h2>我的主场</h2>
        <Link to="/profile?tab=follows">
          管理关注
          <ArrowRight size={13} />
        </Link>
      </div>
      <div className="follow-strip">
        {data.follows.map((f) => (
          <Link
            to={`/search?entity=${f.id}`}
            key={f.id}
            className="follow-chip"
          >
            <EntityAvatar id={f.id} small />
            <span>{getEntity(f.id)?.shortName}</span>
          </Link>
        ))}
        <Link
          to="/profile?tab=follows"
          className="follow-add"
          aria-label="添加关注"
        >
          <Plus size={19} />
          {data.follows.length === 0 && <span>关注你的球队与球员</span>}
        </Link>
      </div>
    </section>
  );
}
