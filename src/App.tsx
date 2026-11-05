import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { EmptyState } from "./components/common/Primitives";
import { Link } from "react-router-dom";
import { HomePage } from "./pages/Home/HomePage";
import { NBAPage } from "./pages/NBA/NBAPage";
import { FootballPage } from "./pages/Football/FootballPage";
import { ArticlePage } from "./pages/Article/ArticlePage";
import { ProfilePage } from "./pages/Profile/ProfilePage";
import { SearchPage } from "./pages/Search/SearchPage";
import { useUser } from "./stores/UserStore";
export default function App() {
  const { data } = useUser();
  return (
    <div data-density={data.preferences.density}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="nba" element={<NBAPage />} />
          <Route path="football" element={<FootballPage />} />
          <Route path="article/:id" element={<ArticlePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route
            path="*"
            element={
              <EmptyState
                title="这个页面暂时不在场"
                description="换个方向，继续你的体育阅读。"
              >
                <Link className="primary-button" to="/">
                  返回首页
                </Link>
              </EmptyState>
            }
          />
        </Route>
      </Routes>
    </div>
  );
}
