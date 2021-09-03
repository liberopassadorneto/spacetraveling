/* eslint-disable react/no-danger */
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';

import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import { ptBR } from 'date-fns/locale';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
}

export default function Post({
  post,
  preview,
  navigation,
}: PostProps): JSX.Element {
  // console.log(post);
  // console.log(preview);

  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const postContent = post.data.content;
  // console.log(postContent);
  const postBody = postContent.map(item => RichText.asText(item.body));
  // console.log(postBody);
  const postHeading = postContent.map(item => item.heading);
  // console.log(postHeading);
  const postHeadingAndBodyWords = postBody.concat(postHeading);
  // console.log(postHeadingAndBodyWords);
  const postWords = postHeadingAndBodyWords.map(item => item.split(/\s+/));
  // console.log(postWords);
  const postBodyAndHeadingLenght = postWords.map(item => item.length);
  // console.log(postBodyAndHeadingLenght);
  const totalPostWords = postBodyAndHeadingLenght.reduce(
    (acc, val) => acc + val
  );
  // console.log(totalPostWords);
  const timeToRead = Math.ceil(totalPostWords / 200);
  // console.log(timeToRead);

  const formattedPostDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    { locale: ptBR }
  );

  const isPostEdited =
    post.first_publication_date !== post.last_publication_date;

  let editionDate;
  if (isPostEdited) {
    editionDate = format(
      new Date(post.last_publication_date),
      " '* editado em' dd MMM yyyy', às' H':'m ",
      { locale: ptBR }
    );
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>
      <img src={post?.data.banner.url} alt="banner" className={styles.banner} />
      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div className={styles.postHeader}>
            <h1>{post.data.title}</h1>
            <ul className={styles.postInfo}>
              <li>
                <FiCalendar size={20} />
                <time>{formattedPostDate}</time>
              </li>
              <li>
                <FiUser size={20} />
                <span>{post?.data.author}</span>
              </li>
              <li>
                <FiClock size={20} />
                <span>{timeToRead} min</span>
              </li>
            </ul>
            {isPostEdited && (
              <span className={styles.editionDate}>{editionDate}</span>
            )}
          </div>
          {post?.data.content.map(content => (
            <article key={content.heading} className={styles.postContent}>
              <h2>{content.heading}</h2>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          ))}
        </div>
      </main>
      <footer className={commonStyles.container}>
        <div className={styles.navigation}>
          {navigation?.prevPost.length > 0 && (
            <div>
              <h3>{navigation.prevPost[0].data.title}</h3>
              <Link href={`/post/${navigation.prevPost[0].uid}`}>
                <a>Post anterior</a>
              </Link>
            </div>
          )}
          {navigation?.nextPost.length > 0 && (
            <div>
              <h3>{navigation.nextPost[0].data.title}</h3>
              <Link href={`/post/${navigation.nextPost[0].uid}`}>
                <a>Próximo post </a>
              </Link>
            </div>
          )}
        </div>

        <Comments />

        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.preview}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </footer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'post'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref || null,
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      preview,
      navigation: { prevPost: prevPost?.results, nextPost: nextPost?.results },
    },
  };
};
